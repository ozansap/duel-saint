import { ShopItem } from "@utils/types";
import { GeneralHandler } from "./db";

export class Shop {
  static items: ShopItem[];
  static enabled: boolean;
  static message: string;

  static refresh() {
    Shop.items = GeneralHandler.data.shop.items.sort((a, b) => b.cost - a.cost);
    Shop.enabled = GeneralHandler.data.shop.enabled;
    Shop.message = GeneralHandler.data.shop.message;
  }

  static add(item: ShopItem) {
    Shop.items.push(Object.assign(item));
  }

  static remove(names: string[]) {
    for (let name of names) {
      let index = Shop.items.findIndex(i => i.name === name);
      Shop.items.splice(index, 1);
    }
  }

  static buy() {

  }

  static async save() {
    let handler = new GeneralHandler();
    handler.shop_set({ items: Shop.items, enabled: Shop.enabled, message: Shop.message });
    await handler.update();
  }
}