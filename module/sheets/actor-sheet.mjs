const { HandlebarsApplicationMixin } = foundry.applications.api;
const { DocumentSheetV2 } = foundry.applications.api;
import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {DocumentSheetV2}
 * @mixes {HandlebarsApplication}
 */
export class BoilerplateActorSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['boilerplate', 'sheet', 'actor'],
    position: { width: 600, height: 600 },
    form: {
      submitOnChange: true
    },
    actions: {
      editItem: BoilerplateActorSheet.#editItem,
      createItem: BoilerplateActorSheet.#createItem,
      deleteItem: BoilerplateActorSheet.#deleteItem,
      manageEffect: BoilerplateActorSheet.#manageEffect,
      roll: BoilerplateActorSheet.#onRoll,
    }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "features", label: "Features" },
        { id: "description", label: "Description" },
        { id: "items", label: "Items" },
        { id: "spells", label: "Spells" },
        { id: "effects", label: "Effects" },
      ],
      initial: "features",
    },
  };

  /** @override */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (group === "primary" && this.actor.type === 'npc') {
      // NPCs don't have features or spells tabs
      delete tabs.features;
      delete tabs.spells;
      // Set description as initial tab for NPCs
      tabs.description.active = true;
      tabs.description.cssClass = "active";
    }
    return tabs;
  }

  /** @override */
  static PARTS = {
    header: {
      template: "systems/boilerplate/templates/actor/parts/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    features: {
      template: "systems/boilerplate/templates/actor/parts/features.hbs",
      scrollable: [""],
    },
    description: {
      template: "systems/boilerplate/templates/actor/parts/description.hbs",
      scrollable: [""],
    },
    items: {
      template: "systems/boilerplate/templates/actor/parts/items.hbs",
      scrollable: [""],
    },
    spells: {
      template: "systems/boilerplate/templates/actor/parts/spells.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/boilerplate/templates/actor/parts/effects.hbs",
      scrollable: [""],
    },
  };

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    // Dynamically set templates based on actor type
    const actorType = this.actor.type;

    // Set header template based on actor type
    if (actorType === 'npc') {
      parts.header.template = `systems/boilerplate/templates/actor/parts/header-npc.hbs`;
      // Remove tabs that NPCs don't have
      delete parts.features;
      delete parts.spells;
    } else {
      parts.header.template = `systems/boilerplate/templates/actor/parts/header.hbs`;
    }

    // Set tab templates (these are shared)
    if (parts.description) parts.description.template = `systems/boilerplate/templates/actor/parts/description.hbs`;
    if (parts.items) parts.items.template = `systems/boilerplate/templates/actor/parts/items.hbs`;
    if (parts.effects) parts.effects.template = `systems/boilerplate/templates/actor/parts/effects.hbs`;
    if (parts.features) parts.features.template = `systems/boilerplate/templates/actor/parts/features.hbs`;
    if (parts.spells) parts.spells.template = `systems/boilerplate/templates/actor/parts/spells.hbs`;

    return parts;
  }

  /**
   * The Actor document managed by this sheet.
   * @type {Actor}
   */
  get actor() {
    return this.document;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    // For the tabs navigation part, convert tabs object to array
    if (partId === 'tabs' && context.tabs) {
      context.tabs = Object.values(context.tabs);
    }
    // For tab content parts, provide the tab context
    else {
      const tab = context.tabs?.[partId];
      if (tab) {
        context.tab = tab;
      }
    }
    return context;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = context.document;
    const actorData = actor.system;

    // Add the actor's data to context for easier access, as well as flags.
    context.actor = actor;
    context.data = actor.toObject(); // Legacy compatibility
    context.system = actorData;
    context.flags = actor.flags;

    // Template convenience variables
    context.cssClass = [...this.options.classes, actor.type].join(' ');
    context.owner = actor.isOwner;

    // Add items array for compatibility with legacy getData() structure
    context.items = Array.from(actor.items.values());
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} context The context to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.BOILERPLATE.abilities[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} context The context to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Activate the initial tab if this is the first render
    if (options.isFirstRender) {
      // Determine the correct initial tab based on actor type
      let initialTabId;
      if (this.actor.type === 'npc') {
        // For NPCs, description is the initial tab (set in _prepareTabs)
        initialTabId = 'description';
      } else {
        // For characters, use the initial tab from static TABS
        initialTabId = this.constructor.TABS.primary.initial;
      }

      // Only activate if the tab exists
      if (initialTabId && this.element.querySelector(`.tab[data-group="primary"][data-tab="${initialTabId}"]`)) {
        this.changeTab(initialTabId, "primary", { force: true, updatePosition: false });
      }
    }

    // Drag events for macros.
    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      const itemElements = this.element.querySelectorAll('li.item');
      for (const li of itemElements) {
        if (li.classList.contains('inventory-header')) continue;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      }
    }
  }

  /**
   * Handle editing an item.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static #editItem(event, target) {
    const li = target.closest('.item');
    const item = this.actor.items.get(li.dataset.itemId);
    item.sheet.render(true);
  }

  /**
   * Handle creating a new Owned Item for the actor.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static async #createItem(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    const data = foundry.utils.deepClone(target.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    delete itemData.system['type'];
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle deleting an item.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static async #deleteItem(event, target) {
    const li = target.closest('.item');
    const item = this.actor.items.get(li.dataset.itemId);
    await item.delete();
    // Use native DOM to hide the element
    li.style.display = 'none';
    this.render(false);
  }

  /**
   * Handle active effect management.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static #manageEffect(event, target) {
    const row = target.closest('li');
    const document =
      row.dataset.parentId === this.actor.id
        ? this.actor
        : this.actor.items.get(row.dataset.parentId);
    onManageActiveEffect(event, document);
  }

  /**
   * Handle clickable rolls.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static #onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = target.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  /**
   * Handle drag start for macros.
   * @param {DragEvent} event   The drag start event
   * @private
   */
  _onDragStart(event) {
    const target = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData;
    if (target.dataset.itemId) {
      const item = this.actor.items.get(target.dataset.itemId);
      dragData = item.toDragData();
    }

    if (dragData) {
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
  }
}
