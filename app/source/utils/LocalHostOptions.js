export class LocalHostOptions {
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

  static async loadOptions() {
    // Implementation for loading options
  }

  static async saveOption(path, value, type, skipSave = false) {
    localStorage.setItem(path, value)
  }
}
