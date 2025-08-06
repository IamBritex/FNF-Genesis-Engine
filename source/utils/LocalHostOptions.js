/**
 * Utility class for managing options in localStorage.
 */
export class LocalHostOptions {
  /**
   * Loads options from localStorage into the configuration object.
   * @param {Object} config - The configuration object.
   * @returns {Object} The updated configuration object.
   */
  static async loadOptionsToConfig(config) {
    const sections = config.sections

    for (const section of sections) {
      if (section.subsections) {
        for (const subsection of section.subsections) {
          if (subsection.options) {
            for (const option of subsection.options) {
              const path = `${section.title}.${subsection.title}.${option.name}`.toUpperCase()
              const storedValue = localStorage.getItem(path)

              if (storedValue !== null) {
                if (option.type === "boolean") {
                  option.value = storedValue === "true"
                } else if (option.type === "number") {
                  option.value = Number.parseFloat(storedValue)
                } else if (option.type === "static") {
                  option.currentValue = Number.parseInt(storedValue)
                } else {
                  option.value = storedValue
                }
              }
            }
          }
        }
      }
    }

    return config
  }

  /**
   * Saves an option to localStorage.
   * @param {string} path - The path/key for the option.
   * @param {*} value - The value to save.
   * @param {string} type - The type of the option.
   * @param {boolean} [skipSave=false] - Whether to skip saving (unused in this implementation).
   */
  static async saveOption(path, value, type, skipSave = false) {
    localStorage.setItem(path, value)
  }
}
