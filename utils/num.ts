import { RankInfo } from "./types";
import { ranks } from "./vars";

export function randBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

export function number(number: number, unit: string = "", suffix: string = "s", cut: number = 0): string {
	let sign = "";
	if (number < 0) {
		number *= -1;
		sign = "-";
	}

	let numberStr = number.toString();

	for (let i = 3; i < numberStr.length; i += 4) {
		numberStr = `${numberStr.slice(0, numberStr.length - i)},${numberStr.slice(numberStr.length - i)}`;
	}

	if (unit) {
		unit = number == 1 ? unit : `${unit.slice(0, unit.length - cut)}${suffix}`;
	}

	return `${sign}${numberStr}${unit ? " " + unit : ""}`;
}

export function shuffle(array: any[]): typeof array {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}

	return array;
}

export function uid(x: number): string {
	let res = "";
	const list = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	for (let i = 0; i < x; i++) {
		res += list.charAt(Math.floor(Math.random() * list.length));
	}

	return res;
}

export function rank(elo: number): RankInfo {
	const n = ranks.filter((r) => r.elo <= elo).length - 1;

	const name = ranks[n].name;
	const interval = n < 21 ? ranks[n + 1].elo - ranks[n].elo : elo - ranks[n].elo;
	const progress = (elo - ranks[n].elo) / interval;
	const remaining = interval - (elo - ranks[n].elo);

	return {
		n,
		name,
		progress,
		remaining,
	};
}

export function createBar(n: number, l: number): string {
	let filledSquares = Math.floor(n * l);
	let message = 0 < filledSquares ? "<:blf:1056358321189306409>" : "<:ble:1056358258132144258>";
	for (let i = 1; i < l - 1; i++) {
		message += i < filledSquares ? "<:bmf:1056358342928388157>" : "<:bme:1056358282350043196>";
	}
	message += l - 1 < filledSquares ? "<:brf:1056358364550004766>" : "<:bre:1056358301216030771>";
	return message;
}

export function clamp(min: number, x: number, max: number): number {
	return Math.min(Math.max(x, min), max);
}
