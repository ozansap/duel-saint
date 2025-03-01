import fs from "fs";

export class Cards {
  static parsed: any;
  static codes: Card[];
  static characters: Card[];
  static actions: Card[];

  static refresh() {
    Cards.parsed = JSON.parse(fs.readFileSync("cards.json", "utf-8"));
    Cards.codes = Cards.parsed.codes;
    Cards.characters = Cards.codes.filter((c: Card) => c.type === "character");
    Cards.actions = Cards.codes.filter((c: Card) => c.type === "action").sort((a, b) => a.id - b.id);
  }
}

export type Card = {
  name: string,
  id: number,
  code: number,
  type: "character" | "action",
}