import { ItemTag, ShopItem } from "@utils/types";
import { GeneralHandler } from "./db";

export class Shop {
  static items: ShopItem[];
  static tags: ItemTag[];
  static enabled: boolean;
  static message: string;

  static refresh() {
    Shop.items = GeneralHandler.data.shop.items.sort((a, b) => b.cost - a.cost);
    Shop.tags = GeneralHandler.data.shop.tags;
    Shop.enabled = GeneralHandler.data.shop.enabled;
    Shop.message = GeneralHandler.data.shop.message;
  }

  static add_item(item: ShopItem) {
    Shop.items.push(Object.assign(item));
  }

  static remove_items(names: string[]) {
    for (let name of names) {
      let index = Shop.items.findIndex(i => i.name === name);
      Shop.items.splice(index, 1);
    }
  }

  static add_tag(tag: ItemTag) {
    Shop.tags.push(tag);
  }

  static remove_tags(values: string[]) {
    for (let value of values) {
      let index = Shop.tags.findIndex(t => t.value === value);
      Shop.tags.splice(index, 1);
    }
  }

  static async save() {
    let handler = new GeneralHandler();
    handler.shop_set({ items: Shop.items, tags: Shop.tags, enabled: Shop.enabled, message: Shop.message });
    await handler.update();
  }
}