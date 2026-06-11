/**
 * Extend the base Actor document.
 * @extends {Actor}
 */
export class BoilerplateActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  /** @override */
  getRollData() {
    return { ...super.getRollData(), ...this.system.getRollData?.() ?? null };
  }
}
