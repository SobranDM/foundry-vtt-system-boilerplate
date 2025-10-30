import BoilerplateActorBase from "./actor-base.mjs";

export default class BoilerplateCharacter extends BoilerplateActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 })
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    const abilityKeys = Object.keys(CONFIG.BOILERPLATE.abilities);
    const abilitiesSchema = {};
    for (const ability of abilityKeys) {
      abilitiesSchema[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
        mod: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        label: new fields.StringField({ required: true, blank: true })
      });
    }
    schema.abilities = new fields.SchemaField(abilitiesSchema);

    return schema;
  }

  prepareBaseData() {
    super.prepareBaseData();
    // Initialize data structures before derived calculations
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Loop through ability scores, and add their modifiers to our sheet output.
    if (!this.abilities) return;
    for (const key in this.abilities) {
      // Ensure the ability object exists
      if (!this.abilities[key]) continue;
      // Calculate the modifier using d20 rules.
      this.abilities[key].mod = Math.floor((this.abilities[key].value - 10) / 2);
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.BOILERPLATE.abilities[key]) ?? key;
    }
  }

  getRollData() {
    const data = {};

    // Copy the ability scores so that rolls can use formulas like `@abilities.dex.mod`
    if (this.abilities) {
      data.abilities = {};
      for (let [k, v] of Object.entries(this.abilities)) {
        data.abilities[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data
  }
}