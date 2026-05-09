import { createReadStream } from "fs";
import { open } from "fs/promises";

function computeData(pattern: string): Int32Array {
	const table = new Int32Array(pattern.length);
	let j = 0;
	for (let i = 1; i < pattern.length; i++) {
		while (j > 0 && pattern[i] !== pattern[j]) {
			j = table[j - 1]!;
		}
		if (pattern[i] === pattern[j]) {
			j++;
		}
		table[i] = j;
	}
	return table;
}

export async function readIndexOf(
	path: string,
	data: string,
	startAt: number = 0,
): Promise<number> {
	const table = computeData(data);
	const stream = createReadStream(path, { highWaterMark: 64 * 1024, start: startAt });

	let globalIndex = 0;
	let j = 0;

	return new Promise((resolve, reject) => {
		stream.on("data", (chunk: Buffer) => {
			for (let i = 0; i < chunk.length; i++) {
				const charCode = chunk[i];
				const patternCode = data.charCodeAt(j);

				while (j > 0 && charCode !== patternCode) {
					j = table[j - 1]!;
				}

				if (charCode === data.charCodeAt(j)) {
					j++;
				}

				if (j === data.length) {
					const foundAt = globalIndex + i - (data.length - 1);
					stream.destroy();
					resolve(foundAt);
					return;
				}
			}
			globalIndex += chunk.length;
		});

		stream.on("end", () => resolve(-1));
		stream.on("error", reject);
	});
}

export async function writeAt(path: string, data: string, position: number) {
	if (position < 0) {
		throw new Error("Position cannot be negative");
	}
	const file = await open(path, "r+");
	const insertBuffer = Buffer.from(data);
	const insertLen = insertBuffer.length;

	try {
		const { size: oldSize } = await file.stat();

		await file.truncate(oldSize + insertLen);

		const chunkSize = 64 * 1024;
		const buffer = Buffer.alloc(chunkSize);

		let bytesToMove = oldSize - position;

		while (bytesToMove > 0) {
			const currentChunkSize = Math.min(bytesToMove, chunkSize);
			const readOffset = oldSize - (oldSize - position - bytesToMove) - currentChunkSize;
			const writeOffset = readOffset + insertLen;

			await file.read(buffer, 0, currentChunkSize, readOffset);
			await file.write(buffer, 0, currentChunkSize, writeOffset);

			bytesToMove -= currentChunkSize;
		}

		await file.write(insertBuffer, 0, insertLen, position);
	} finally {
		await file.close();
	}
}
