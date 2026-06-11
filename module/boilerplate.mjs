import { BoilerplateActor } from './documents/actor.mjs';
import { BoilerplateItem } from './documents/item.mjs';
import { BoilerplateActorSheet } from './sheets/actor-sheet.mjs';
import { BoilerplateItemSheet } from './sheets/item-sheet.mjs';
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { BOILERPLATE } from './helpers/config.mjs';
import * as models from './data/_module.mjs';

Hooks.once('init', function () {
  game.boilerplate = {
    BoilerplateActor,
    BoilerplateItem,
    rollItemMacro,
  };

  CONFIG.BOILERPLATE = BOILERPLATE;

  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  CONFIG.Actor.documentClass = BoilerplateActor;
  Object.assign(CONFIG.Actor.dataModels, {
    character: models.BoilerplateCharacter,
    npc: models.BoilerplateNPC,
  });

  CONFIG.Item.documentClass = BoilerplateItem;
  Object.assign(CONFIG.Item.dataModels, {
    item: models.BoilerplateItem,
    feature: models.BoilerplateFeature,
    spell: models.BoilerplateSpell,
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, 'boilerplate', BoilerplateActorSheet, {
    types: ['character', 'npc'],
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Actor',
  });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item, 'boilerplate', BoilerplateItemSheet, {
    types: ['item', 'feature', 'spell'],
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Item',
  });

  return preloadHandlebarsTemplates();
});

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Hooks.once('ready', function () {
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

async function createItemMacro(data, slot) {
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  const item = await Item.fromDropData(data);
  const command = `game.boilerplate.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'boilerplate.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

function rollItemMacro(itemUuid) {
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  Item.fromDropData(dropData).then((item) => {
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }
    item.roll();
  });
}
