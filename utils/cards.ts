import fs from "fs";

export class Cards {
  static parsed = JSON.parse(fs.readFileSync("../cards.json", "utf-8"));
  static all: Card[] = Cards.parsed.all;
  static characters: Card[] = Cards.all.filter((c: Card) => c.type === "character");
  static actions: Card[] = Cards.all.filter((c: Card) => c.type === "action").sort((a, b) => a.id - b.id);

  static refresh() {
    Cards.parsed = JSON.parse(fs.readFileSync("../cards.json", "utf-8"));
    Cards.all = Cards.parsed.all;
    Cards.characters = Cards.all.filter((c: Card) => c.type === "character");
    Cards.actions = Cards.all.filter((c: Card) => c.type === "action").sort((a, b) => a.id - b.id);
  }
}

export type Card = {
  name: string,
  id: number,
  code: number,
  type: "character" | "action",
}