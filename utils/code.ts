import axios from "axios";
import { ComparisonOptions } from "resemblejs";
import compareImages from "resemblejs/compareImages";
import sharp from "sharp";
import { convertBase } from "simple-base-converter";
import cards from "../cards.json";

// order of chars in base 62
const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// holds the position of cards in deck image
// unneeded if you already know the cards in the deck
const position = {
	characters: [
		{ left: 353, top: 178, width: 138, height: 236 },
		{ left: 515, top: 178, width: 138, height: 236 },
		{ left: 677, top: 178, width: 138, height: 236 },
	],
	deck: [
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

// finds out which characters and cards are in a deck image
// unneeded if you already know the cards in the deck
// returns [error, null] if there is an error
// returns [null, CardsData] if there is no error
export const extract = async (url: string): Promise<Unsure<CardsData>> => {
	let cardsData: CardsData = {
		version: cards.latest as Version,
		characters: [],
		deck: {},
	};

	const latest = cards[cards.latest as Version];

	const response = await axios.get(url, { responseType: "arraybuffer" });
	const buffer = Buffer.from(response.data, "utf-8");

	for (const p of position.characters) {
		const cropped = await sharp(buffer).extract(p).toBuffer();

		for (let i = 0; i < latest.characters.length; i++) {
			const char = latest.characters[i];

			const options: ComparisonOptions = {
				scaleToSameSize: true,
				ignore: "antialiasing",
				returnEarlyThreshold: 20,
			};

			const data = await compareImages(cropped, char.resource, options);

			if (data.misMatchPercentage < 20) {
				cardsData.characters.push(i);
				break;
			}
		}
	}

	if (cardsData.characters.length !== 3) {
		return ["Could not find the character cards", null];
	}

	let cardCount = 0;
	let index = 0;
	for (const p of position.deck) {
		const cropped = await sharp(buffer).extract(p).toBuffer();

		for (let i = index; i < latest.deck.length; i++) {
			const card = latest.deck[i];

			const options: ComparisonOptions = {
				scaleToSameSize: true,
				ignore: "antialiasing",
				returnEarlyThreshold: 20,
			};

			const data = await compareImages(cropped, card.resource, options);

			if (333000 < card.id) {
				if (data.misMatchPercentage > 5) continue;
				index = i;
				cardsData.deck[i] ? cardsData.deck[i]++ : (cardsData.deck[i] = 1);
				//console.log(`${++cardCount}: ${data.misMatchPercentage} - ${card.name}`);
				break;
			}

			if (330000 < card.id && card.id < 331000) {
				if (data.misMatchPercentage > 20) continue;
				index = i;
				cardsData.deck[i] ? cardsData.deck[i]++ : (cardsData.deck[i] = 1);
				//console.log(`${++cardCount}: ${data.misMatchPercentage} - ${card.name}`);
				break;
			}

			if (data.misMatchPercentage < 8) {
				index = i;
				cardsData.deck[i] ? cardsData.deck[i]++ : (cardsData.deck[i] = 1);
				//console.log(`${++cardCount}: ${data.misMatchPercentage} - ${card.name}`);
				break;
			}
		}
	}

	if (Object.values(cardsData.deck).reduce((a, b) => a + b, 0) !== 30) {
		return ["Could not find the action cards", null];
	}

	return [null, cardsData];
};

// returns [error, null] if there is an error
// returns [null, DeckCode (string)] if there is no error
export const encode = (data: CardsData): Unsure<string> => {
	try {
		const l = cards.latest as Version;
		const latest = cards[l];

		// base 3 number that holds information on non character cards in the deck
		let field = Array(latest.deck.length).fill(0);

		// fill the array in reverse so that it works properly
		for (const i in data.deck) {
			field[reverse(field, parseInt(i))] = data.deck[i];
		}

		const deckCode = encodeHeader(l) + encodeCharacters(data.characters) + encodeDeck(field.join(""));
		return [null, deckCode];
	} catch (err) {
		return ["Could not convert into deck code", null];
	}
};

// returns [error, null] if there is an error
// returns [null, CardsData] if there is no error
export const decode = (code: string): Unsure<CardsData> => {
	try {
		// first 2 chars of the code is the version
		const version = decodeHeader(code.slice(0, 2));

		// finds the characters from first 3 variable length numbers
		// returns indexes of characters and the rest of the code converted to base 3
		const { characters, deckCode } = decodeCards(code.slice(2));

		let cardsData: CardsData = {
			version,
			characters,
			deck: {},
		};

		// loop in reverse
		for (let i = deckCode.length - 1; i >= 0; i--) {
			const value = deckCode[i];

			// last digit of deckCode is actually the first card in the array
			const index = reverse(deckCode, i);

			if (value !== "0") {
				cardsData.deck[index] = parseInt(value);
			}
		}

		return [null, cardsData];
	} catch (err) {
		return ["Could not convert your input to a deck", null];
	}
};

export const display = (data: CardsData): string => {
	const version = cards[data.version];

	let description = data.characters.map((i) => version.characters[i].name).join(" - ") + "\n";

	for (const index in data.deck) {
		const value = data.deck[index];
		description += `${value} - ${version.deck[parseInt(index)].name}\n`;
	}

	description += "\n⚠️ This deck code has no function right now";

	return description;
};

const reverse = (arr: any[] | string, n: number): number => {
	return arr.length - 1 - n;
};

const encodeHeader = (x: string): string => {
	return convertBase(x, 10, chars).padStart(2, "0");
};

// xs: array of character indexes
const encodeCharacters = (xs: number[]): string => {
	let res = "";

	// for each character: divide index by 62
	// quotient rounded down times "z"
	// remainder is converted to base 62
	for (const x of xs) {
		res += chars[chars.length - 1].repeat(Math.floor(x / chars.length));
		res += chars[x % chars.length];
	}

	return res;
};

// ~150 digit number is too big for JS to handle, use string
const encodeDeck = (x: string): string => {
	return convertBase(x, "012", chars);
};

const decodeHeader = (x: string): Version => {
	return convertBase(x, chars, 10) as Version;
};

const decodeCards = (x: string) => {
	let characters = [];
	let characterLength = 0;

	// we don't know the length of the part that contains information on characters
	// so this runs until 3 characters are found
	// a character is found when a char other than "z" is read
	for (let i = 0; i < x.length; i++) {
		let characterCode = x[i];

		// if char is "z" next char belongs to this character too
		while (characterCode[characterCode.length - 1] === chars[chars.length - 1]) {
			characterCode += x[++i];
		}

		characters.push(decodeCharacter(characterCode));
		characterLength = i;

		if (characters.length === 3) break;
	}

	return {
		characters,
		deckCode: convertBase(x.slice(characterLength + 1), chars, "012"),
	};
};

// x: variable length number in base 62
// "3" ⟶ 3; "A" ⟶ 10; "z0" ⟶ 62; "zzz6" ⟶ 193
const decodeCharacter = (x: string): number => {
	let n = 0;

	for (let i = 0; i < x.length; i++) {
		n += chars.indexOf(x[i]);
	}

	return n;
};

// characters: an array of length 3, elements are the indexes of characters
// deck: (index of the non character card): (how many copies of that card are in the deck)
type CardsData = {
	version: Version;
	characters: number[];
	deck: {
		[index: string]: number;
	};
};

// version number as string
// must be a key of cards from cards.json
type Version = Exclude<keyof typeof cards, "latest">;

type Unsure<T> = [error: null, result: T] | [error: string, result: null];
