import fs from "fs";
import { Card, Cards } from "@utils/cards";
import { decode } from "@utils/code";
import { ErrorResult, Maybe, SuccessResult } from "@utils/types";

const path_dir_cards = './cards';
const api_code = 'https://sg-public-api.hoyolab.com/event/cardsquare/encode_card_code?lang=en-us';
const api_cards = {
  characters: 'https://sg-public-api.hoyolab.com/event/cardsquare/roles?lang=en-us',
  actions: 'https://sg-public-api.hoyolab.com/event/cardsquare/actions?lang=en-us'
};

const requests = [
  {
    type: 'characters' as 'characters',
    data: 'roles',
  },
  {
    type: 'actions' as 'actions',
    data: 'actions',
  }
];

function get_options(type: 'characters' | 'actions', cardsJSON: any) {
  if (type === 'characters') {
    return {
      method: 'GET',
    }
  } else {
    return {
      method: 'POST',
      body: JSON.stringify({
        role_ids: cardsJSON.characters.map((c: API_Card) => c.id)
      }),
    }
  }
}

function cleanup(json: any): API_Card[] {
  return json.map((c: any) => ({
    id: c.basic.item_id,
    name: c.basic.name,
    icon: c.basic.icon,
    icon_small: c.basic.icon_small,
  }));
}

export async function update_cards(): Promise<Maybe<{ length: number, message: string }>> {
  let cardsJSON;

  try {
    cardsJSON = JSON.parse(fs.readFileSync("cards.json", "utf-8"));
  } catch (error) {
    cardsJSON = {
      characters: [],
      actions: [],
      codes: []
    };
  }

  let old_characters = cardsJSON.characters as API_Card[];
  let old_actions = cardsJSON.actions as API_Card[];

  try {
    for (const req of requests) {
      let response = await fetch(api_cards[req.type], get_options(req.type, cardsJSON));
      let json = await response.json() as any;
      cardsJSON[req.type] = cleanup(json.data[req.data]);
    }
  } catch (error) {
    console.error(error);
  }

  let new_characters = cardsJSON.characters.filter((nc: API_Card) => !old_characters.some((oc) => oc.id === nc.id)) as API_Card[];
  let new_actions = cardsJSON.actions.filter((na: API_Card) => !old_actions.some((oa) => oa.id === na.id)) as API_Card[];
  let new_cards = [...new_characters, ...new_actions];

  if (new_cards.length === 0) return SuccessResult({ length: 0, message: "" });

  let codes_result = await update_codes(new_characters, new_actions);
  if (codes_result.error) return codes_result;
  cardsJSON.codes.push(...codes_result.data);

  await update_images(new_cards);

  fs.writeFileSync('./cards.json', JSON.stringify(cardsJSON, null, 2));
  Cards.refresh();
  return SuccessResult({ length: new_cards.length, message: new_cards.map(c => `\`${c.name}\`: ${c.id} ➜ ${codes_result.data.find(code => code.id === c.id)?.code}`).join("\n") });
}

async function update_codes(characters: API_Card[], actions: API_Card[]): Promise<Maybe<Card[]>> {
  let codes: Card[] = [];
  let remaining_characters = [...characters];
  let remaining_actions = [...actions];

  while (codes.length < characters.length + actions.length) {
    let new_characters = remaining_characters.splice(0, 3);
    let filler_characters = Cards.characters.slice(0, 3 - new_characters.length);

    let new_actions = remaining_actions.splice(0, 15);
    let filler_actions = Cards.actions.slice(0, 30 - new_actions.length);

    let body = {
      role_cards: [...new_characters, ...filler_characters].map((c) => c.id),
      action_cards: [...new_actions, ...filler_actions].map((c) => c.id),
    }

    let options = {
      method: 'POST',
      body: JSON.stringify(body),
    }

    try {
      let response = await fetch(api_code, options);
      let json = await response.json() as any;
      let code = json.data.code;
      let decode_result = decode(code);
      if (decode_result.error) throw decode_result.error;

      for (let i = 0; i < new_characters.length; i++) {
        let character = new_characters[i];
        codes.push({
          name: character.name,
          id: character.id,
          code: decode_result.data[i],
          type: 'character'
        });
      }

      let decoded_action_codes = decode_result.data.slice(3);
      let filtered_action_codes = decoded_action_codes.filter(a => !filler_actions.some(fa => fa.code === a));

      for (let i = 0; i < new_actions.length; i++) {
        let action = new_actions[i];
        codes.push({
          name: action.name,
          id: action.id,
          code: filtered_action_codes[i],
          type: 'action'
        });
      }
    } catch (error) {
      console.error(error);
      return ErrorResult("There was an error");
    }
  }

  let sorted = codes.sort((a, b) => a.code - b.code);
  return SuccessResult(sorted);
}

async function update_images(cards: API_Card[]) {
  for (let card of cards) {
    let response = await fetch(card.icon);
    let blob = await response.blob();
    let arrayBuffer = await blob.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    fs.mkdirSync(path_dir_cards, { recursive: true });
    fs.writeFileSync(`${path_dir_cards}/${card.id}.png`, buffer);
  }
}

type API_Card = any;