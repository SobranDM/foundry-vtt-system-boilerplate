const { HandlebarsApplicationMixin } = foundry.applications.api;
const { DocumentSheetV2 } = foundry.applications.api;
import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {DocumentSheetV2}
 * @mixes {HandlebarsApplication}
 */
export class BoilerplateItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['boilerplate', 'sheet', 'item'],
    position: { width: 520, height: 480 },
    form: {
      submitOnChange: true
    },
    actions: {
      manageEffect: BoilerplateItemSheet.#manageEffect,
    }
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", label: "Description" },
        { id: "attributes", label: "Attributes" },
        { id: "effects", label: "Effects" },
      ],
      initial: "description",
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/boilerplate/templates/item/parts/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/boilerplate/templates/item/parts/description.hbs",
      scrollable: [""],
    },
    attributes: {
      template: "systems/boilerplate/templates/item/parts/attributes.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/boilerplate/templates/item/parts/effects.hbs",
      scrollable: [""],
    },
  };

  /**
   * The Item document managed by this sheet.
   * @type {Item}
   */
  get item() {
    return this.document;
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    // Dynamically set header template based on item type
    const itemType = this.item.type;
    // For now, all item types use the same header, but we could customize per type
    parts.header.template = `systems/boilerplate/templates/item/parts/header.hbs`;
    
    // Customize templates based on item type if needed
    // For example, features might not have attributes tab
    if (itemType === 'feature' || itemType === 'spell') {
      // These item types might have different attribute templates
      // For now, keep the same
    }
    
    return parts;
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
    const item = context.document;

    // Use a safe clone of the item data for further operations.
    const itemData = item.toObject();

    // Add the item's data to context for easier access, as well as flags.
    context.item = item;
    context.data = itemData; // Legacy compatibility
    context.system = itemData.system;
    context.flags = itemData.flags;
    
    // Template convenience variables
    context.cssClass = this.options.classes.join(' ');
    context.owner = item.isOwner;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = item.getRollData();

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    
    // Activate the initial tab if this is the first render
    if (options.isFirstRender && this.tabGroups.primary) {
      const initialTab = this.tabGroups.primary;
      // Force activation to ensure the DOM gets the active class
      this.changeTab(initialTab, "primary", { force: true, updatePosition: false });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle active effect management.
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element.
   * @private
   */
  static #manageEffect(event, target) {
    onManageActiveEffect(event, this.item);
  }
}
