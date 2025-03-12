import sharp from "sharp";
import Pixelmatch from "pixelmatch";
import { Cards } from "@utils/cards";
import { ErrorResult, Maybe, SuccessResult } from "@utils/types";

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

	scrambled.push("0", "0", "0");

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

export function decode(code: string): Maybe<number[]> {
	let buffer = Buffer.from(code, 'base64');
	let hex_code = buffer.toString('hex');

	if (hex_code.length !== 102) return ErrorResult("This is not a valid deck code");

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

	if (unscrambled.length !== 33) return ErrorResult("This is not a valid deck code");

	let deck = unscrambled.map(s => parseInt(s, 16));
	return SuccessResult(deck);
}

export async function fromImage(url: string): Promise<Maybe<number[]>> {
	let arrayBuffer;

	try {
		let response = await fetch(url);
		arrayBuffer = await response.arrayBuffer();
	} catch (err) {
		console.error(err);
		return ErrorResult("Something went wrong");
	}

	let characters = Cards.characters;
	let actions = Cards.actions;
	let deck: number[] = [];

	for (const p of position.characters) {
		let cropped = await sharp(arrayBuffer).extract(p).ensureAlpha().raw().toBuffer();

		for (let i = 0; i < characters.length; i++) {
			let card = characters[i];
			let img = await sharp(`cards/${card.id}.png`).resize(p.width, p.height).ensureAlpha().raw().toBuffer();

			let diff = Pixelmatch(cropped, img, null, p.width, p.height, { threshold: 0.1 });

			if (ratio(diff, p.width, p.height) < 0.5) {
				deck.push(card.code);
				break;
			}
		}
	}

	if (deck.length as number !== 3) {
		return ErrorResult("Failed to detect characters");
	}

	let index = 0;
	for (const p of position.actions) {
		let cropped = await sharp(arrayBuffer).extract(p).ensureAlpha().raw().toBuffer();

		for (let i = index; i < actions.length; i++) {
			let card = actions[i];
			let img = await sharp(`cards/${card.id}.png`).resize(p.width, p.height).ensureAlpha().raw().toBuffer();

			let diff = Pixelmatch(cropped, img, null, p.width, p.height, { threshold: 0.1 });

			let isTalent = 210000 < card.id && card.id < 230000;
			let isFood = 333000 < card.id && card.id < 334000;
			let isItem = 323000 < card.id && card.id < 324000;

			let r = ratio(diff, p.width, p.height);
			if ((isTalent || isFood || isItem) && r > 0.2) continue;
			else if (r > 0.3) continue;

			index = i;
			deck.push(card.code);
			break;
		}
	}

	if (deck.length as number !== 33) {
		return ErrorResult("Failed to detect actions");
	}

	return SuccessResult(deck);
}

export async function toImage(deck: number[]): Promise<Maybe<Buffer>> {
	let background = sharp("assets/background.png").raw();
	let composite = [];

	for (let i = 0; i < 3; i++) {
		let card = Cards.characters.find(c => c.code === deck[i]);
		if (card === undefined) return ErrorResult(`Could not find a card with code: ${deck[i]}\nThis is likely because my code isn't updated yet`);
		let img = await sharp(`cards/${card.id}.png`).resize(position.characters[i].width, position.characters[i].height).ensureAlpha().toBuffer();
		let border = await sharp("assets/border.png").resize(position.characters[i].width, position.characters[i].height).ensureAlpha().toBuffer();
		composite.push({ input: img, left: position.characters[i].left, top: position.characters[i].top });
		composite.push({ input: border, left: position.characters[i].left, top: position.characters[i].top });
	}

	for (let i = 3; i < deck.length; i++) {
		let card = Cards.actions.find(c => c.code === deck[i]);
		if (card === undefined) return ErrorResult(`Could not find a card with code: ${deck[i]}\nThis is likely because my code isn't updated yet`);
		let img = await sharp(`cards/${card.id}.png`).resize(position.actions[i - 3].width, position.actions[i - 3].height).ensureAlpha().toBuffer();
		let border = await sharp("assets/border.png").resize(position.actions[i - 3].width, position.actions[i - 3].height).ensureAlpha().toBuffer();
		composite.push({ input: img, left: position.actions[i - 3].left, top: position.actions[i - 3].top });
		composite.push({ input: border, left: position.actions[i - 3].left, top: position.actions[i - 3].top });
	}

	background.composite(composite);
	return SuccessResult(await background.png().toBuffer());
}

export function toText(deck: number[]): Maybe<string> {
	let grouped: Map<number, number> = new Map();
	deck.forEach(v => grouped.set(v, (grouped.get(v) ?? 0) + 1));

	let entries = Array.from(grouped.entries());
	let characters = [];
	let text = "";

	for (let [code, count] of entries.slice(0, 3)) {
		let name = Cards.characters.find(c => c.code === code)?.name;
		if (name === undefined) return ErrorResult(`Could not find a card with code: ${code}\nThis is likely because my code isn't updated yet`);
		characters.push(name);
	}

	for (let [code, count] of entries.slice(3)) {
		let name = Cards.actions.find(c => c.code === code)?.name;
		if (name === undefined) return ErrorResult(`Could not find a card with code: ${code}\nThis is likely because my code isn't updated yet`);
		text += `\n${count} - ${name}`;
	}

	text = characters.join(" - ") + text;
	return SuccessResult(text);
}

function hex_offset(bytes: string[], offset: number) {
	let new_bytes = bytes.map(hex => {
		let byte = parseInt(hex, 16);
		byte = (byte + offset + 256) % 256;
		return byte.toString(16).padStart(2, '0');
	})

	return new_bytes;
}

function ratio(diff: number, width: number, height: number) {
	return diff / (width * height);
}