import sharp from "sharp";
import Pixelmatch from "pixelmatch";
import { Cards } from "./cards";

const position = {
	characters: [
		{ left: 353, top: 178, width: 138, height: 236 },
		{ left: 515, top: 178, width: 138, height: 236 },
		{ left: 677, top: 178, width: 138, height: 236 },
	],
	actions: [
		{ left: 254, top: 522, width: 90, height: 154 },
		{ left: 368, top: 522, width: 90, height: 154 },
		{ left: 482, top: 522, width: 90, height: 154 },
		{ left: 596, top: 522, width: 90, height: 154 },
		{ left: 710, top: 522, width: 90, height: 154 },
		{ left: 824, top: 522, width: 90, height: 154 },
		{ left: 254, top: 700, width: 90, height: 154 },
		{ left: 368, top: 700, width: 90, height: 154 },
		{ left: 482, top: 700, width: 90, height: 154 },
		{ left: 596, top: 700, width: 90, height: 154 },
		{ left: 710, top: 700, width: 90, height: 154 },
		{ left: 824, top: 700, width: 90, height: 154 },
		{ left: 254, top: 878, width: 90, height: 154 },
		{ left: 368, top: 878, width: 90, height: 154 },
		{ left: 482, top: 878, width: 90, height: 154 },
		{ left: 596, top: 878, width: 90, height: 154 },
		{ left: 710, top: 878, width: 90, height: 154 },
		{ left: 824, top: 878, width: 90, height: 154 },
		{ left: 254, top: 1056, width: 90, height: 154 },
		{ left: 368, top: 1056, width: 90, height: 154 },
		{ left: 482, top: 1056, width: 90, height: 154 },
		{ left: 596, top: 1056, width: 90, height: 154 },
		{ left: 710, top: 1056, width: 90, height: 154 },
		{ left: 824, top: 1056, width: 90, height: 154 },
		{ left: 254, top: 1234, width: 90, height: 154 },
		{ left: 368, top: 1234, width: 90, height: 154 },
		{ left: 482, top: 1234, width: 90, height: 154 },
		{ left: 596, top: 1234, width: 90, height: 154 },
		{ left: 710, top: 1234, width: 90, height: 154 },
		{ left: 824, top: 1234, width: 90, height: 154 },
	],
};

const scrambling = [
	[0, 1, 4],
	[5, 8, 9],
	[12, 13, 16],
	[17, 20, 21],
	[24, 25, 28],
	[29, 32, 33],
	[36, 37, 40],
	[41, 44, 45],
	[48, 49, 52],
	[53, 56, 57],
	[60, 61, 64],
	[65, 68, 69],
	[72, 73, 76],
	[77, 80, 81],
	[84, 85, 88],
	[89, 92, 93],
	[96, 97, 2],
	[3, 6, 7],
	[10, 11, 14],
	[15, 18, 19],
	[22, 23, 26],
	[27, 30, 31],
	[34, 35, 38],
	[39, 42, 43],
	[46, 47, 50],
	[51, 54, 55],
	[58, 59, 62],
	[63, 66, 67],
	[70, 71, 74],
	[75, 78, 79],
	[82, 83, 86],
	[87, 90, 91],
	[94, 95, 98],
]

export function encode(deck: number[], offset: number = 0): string {
	let unscrambled = deck.map(d => d.toString(16).padStart(3, '0'));
	let scrambled: string[] = [];

	for (let i = 0; i < scrambling.length; i++) {
		scrambling[i].forEach((s, j) => {
			scrambled[s] = unscrambled[i][j];
		})
	}

	scrambled.push(...offset.toString(16).padStart(3, '0'))

	let bytes = [];
	for (let i = 0; i < scrambled.length; i += 2) {
		let byte = scrambled[i] + scrambled[i + 1];
		bytes.push(byte);
	}

	let hex_code = hex_offset(bytes, offset).join("");
	let buffer = Buffer.from(hex_code, 'hex');
	let code = buffer.toString('base64');
	return code;
}

export function decode(code: string): number[] {
	let buffer = Buffer.from(code, 'base64');
	let hex_code = buffer.toString('hex');

	let bytes = [];
	for (let i = 0; i < hex_code.length; i += 2) {
		let byte = hex_code[i] + hex_code[i + 1];
		bytes.push(byte);
	}

	let offset = parseInt(bytes[bytes.length - 1], 16);
	let scrambled = hex_offset(bytes, -offset).join("");
	let unscrambled = [];

	for (let i = 0; i < scrambling.length; i++) {
		unscrambled.push(scrambling[i].map(s => scrambled[s]).join(""));
	}

	let deck = unscrambled.map(s => parseInt(s, 16));
	return deck;
}

export async function fromImage(url: string): Promise<number[] | Error> {
	let response = await fetch(url);
	let arrayBuffer = await response.arrayBuffer();
	let characters = Cards.characters;
	let actions = Cards.actions;
	let deck: number[] = [];

	for (const p of position.characters) {
		let cropped = await sharp(arrayBuffer).extract(p).resize(420, 720, { fit: 'contain' }).png().toBuffer();

		for (let i = 0; i < characters.length; i++) {
			let card = characters[i];
			let img = await sharp(`cards/${card.id}.png`).resize(420, 720, { fit: "contain" }).toBuffer();

			let diff = Pixelmatch(cropped, img, null, 420, 720, { threshold: 0.1 });

			if (ratio(diff) < 0.1) {
				deck.push(card.code);
				break;
			}
		}
	}

	if (deck.length as number !== 3) {
		return new Error("Failed to detect characters");
	}

	let index = 0;
	for (const p of position.actions) {
		let cropped = await sharp(arrayBuffer).extract(p).resize(420, 720, { fit: 'contain' }).png().toBuffer();

		for (let i = index; i < actions.length; i++) {
			let card = actions[i];
			let img = await sharp(`cards/${card.id}.png`).resize(420, 720, { fit: "contain" }).toBuffer();

			let diff = Pixelmatch(cropped, img, null, 420, 720, { threshold: 0.1 });

			let isFood = 333000 < card.id;

			if (isFood && ratio(diff) > 0.05) continue;
			else if (ratio(diff) > 0.08) continue;

			index = i;
			deck.push(card.code);
			break;
		}
	}

	if (deck.length as number !== 30) {
		return new Error("Failed to detect actions");
	}

	return deck;
}

export function toImage() {

}

export function toText(deck: number[]): string {
	let grouped: Map<number, number> = new Map();
	deck.forEach(v => grouped.set(v, (grouped.get(v) ?? 0) + 1));

	let entries = Array.from(grouped.entries());
	let characters = [entries.shift(), entries.shift(), entries.shift()];
	if (characters.some(c => c === undefined)) throw new Error("Characters not found");
	let lines = characters.map((entry) => Cards.all.find(c => c.code === entry![0])?.name).join(" - ");

	for (let [code, count] of entries) {
		let name = Cards.all.find(c => c.code === code)?.name;
		if (!name) throw new Error(`Card not found: ${code}`);
		lines += `\n${count} - ${name}`;
	}

	return lines;
}

function hex_offset(bytes: string[], offset: number) {
	let new_bytes = bytes.map(hex => {
		let byte = parseInt(hex, 16);
		byte = (byte + offset + 256) % 256;
		return byte.toString(16).padStart(2, '0');
	})

	return new_bytes;
}

function ratio(diff: number) {
	return diff / (420 * 720);
}