import dayjs, { OpUnitType } from "dayjs";
import plugin_utc from "dayjs/plugin/utc";
import plugin_duration from "dayjs/plugin/duration";
import humanizeDuration from "humanize-duration";

dayjs.extend(plugin_utc);
dayjs.extend(plugin_duration);

export function now(): number {
	return dayjs.utc().unix();
}

export function day(n: number = now()): number {
	const day = dayjs.duration(n, "s").asDays();

	return Math.floor(day);
}

export function diff(n1: number, n2: number = now()): number {
	return day(n1) - day(n2);
}

export function sameDay(n1: number, n2: number = now()): boolean {
	const d1 = dayjs.unix(n1).utc();
	const d2 = dayjs.unix(n2).utc();

	return d1.isSame(d2, "day");
}

export function date(n: number = now()): string {
	const d = dayjs.unix(n).utc();
	return d.format("DD/MM/YYYY");
}

export function untilEnd(s: OpUnitType = "day", n: number = now()): number {
	const d = dayjs.unix(n).utc();
	const d2 = d.endOf(s);
	return d2.diff(d);
}

export function duration(n: number): string {
	const d = dayjs.duration(n);
	return humanizeDuration(d.asMilliseconds(), { largest: 2, maxDecimalPoints: 0 });
}

export function end(): string {
	const d = dayjs.unix(now()).utc();
	const d2 = d.endOf("day");
	return d2.format();
}

export function year(): number {
	return now() + 60 * 60 * 24 * 365;
}
