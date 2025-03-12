import { UserData } from "@utils/types";

export const colors = {
	default: 0xe6ab5f,
	red: 0xe06666,
	yellow: 0xffd966,
	green: 0x93c47d,
};

export const ranks = [
	{ name: "Beginner I", elo: 1000, role: "1056361527478857879", floor: true },
	{ name: "Beginner II", elo: 1020, role: "1056361644843876372", floor: true },
	{ name: "Beginner III", elo: 1040, role: "1056363620562370662", floor: true },
	{ name: "Beginner IV", elo: 1060, role: "1056363694822535260", floor: true },
	{ name: "Beginner V", elo: 1080, role: "1056363753479868457", floor: true },
	{ name: "Advanced I", elo: 1100, role: "1056363922279637054", floor: true },
	{ name: "Advanced II", elo: 1140, role: "1056365335902683166", floor: false },
	{ name: "Advanced III", elo: 1180, role: "1056365397588328489", floor: false },
	{ name: "Advanced IV", elo: 1220, role: "1056365463241760819", floor: false },
	{ name: "Advanced V", elo: 1260, role: "1056365523396476978", floor: false },
	{ name: "Expert I", elo: 1300, role: "1056365584402620447", floor: true },
	{ name: "Expert II", elo: 1360, role: "1056365671065333810", floor: false },
	{ name: "Expert III", elo: 1420, role: "1056365736450347028", floor: false },
	{ name: "Expert IV", elo: 1480, role: "1056365794361090150", floor: false },
	{ name: "Expert V", elo: 1540, role: "1056365821145923646", floor: false },
	{ name: "Master I", elo: 1600, role: "1056365866134028338", floor: true },
	{ name: "Master II", elo: 1680, role: "1056365925965779004", floor: false },
	{ name: "Master III", elo: 1760, role: "1056366126021480489", floor: false },
	{ name: "Master IV", elo: 1840, role: "1056366122556993637", floor: false },
	{ name: "Master V", elo: 1920, role: "1056366114210320435", floor: false },
	{ name: "Legend", elo: 2000, role: "1056366110422859846", floor: true },
	{ name: "Genius Invoker", elo: 2500, role: "1056366102709534740", floor: true },
];

export const seasons = {
	current: 7,
	dates: [1672178400, 1677621600, 1681250400, 1684879200, 1688508000, 1692136800, 1695765600, 1699394400],
	all: () => Array.from({ length: seasons.current }, (x, i) => i).splice(1, seasons.current),
};

export const events = [
	{
		id: "unique_opponents",
		name: "10 Unique Opponents",
		description: "Play a ranked duel against 10 unique opponents",
		reward: "Enter [Blessing of the Welkin Moon] Raffle (5 winners)",
		end: seasons.dates[seasons.current],
		goal: 10,
		progress: (d: UserData) => d.events?.unique_opponents?.length ?? 0,
		active: false,
	},
];
