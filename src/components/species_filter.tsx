import { treeColors, genusDisplayNames } from "../constants";

interface Props {
    selectedSpecies: string[]
    availableSpecies: string[]
    speciesDropdownOpen: boolean
    toggleSpecies: (genus: string) => void
    toggleAllSpecies: () => void
    setSpeciesDropdownOpen: (open: boolean) => void
}

const SpeciesFilter = ({
    selectedSpecies,
    availableSpecies,
    speciesDropdownOpen,
    toggleSpecies,
    toggleAllSpecies,
    setSpeciesDropdownOpen,
}: Props) => {
    return (
        <div className="species-filter">
          <button
            onClick={() => setSpeciesDropdownOpen(!speciesDropdownOpen)}
            style={{ padding: "5px 10px", cursor: "pointer" }}
          >
            Species ({selectedSpecies.length}/{availableSpecies.length}) ▾
          </button>
          <div
            className={`species-dropdown ${speciesDropdownOpen ? "open" : ""}`}
          >
            <label
              className="species-checkbox"
              style={{
                fontWeight: "bold",
                borderBottom: "1px solid #ccc",
                paddingBottom: "5px",
              }}
            >
              <input
                type="checkbox"
                checked={selectedSpecies.length === availableSpecies.length}
                onChange={toggleAllSpecies}
              />
              Select All
            </label>
            {availableSpecies.map((genus) => (
              <label key={genus} className="species-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSpecies.includes(genus)}
                  onChange={() => toggleSpecies(genus)}
                />
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    backgroundColor: treeColors[genus],
                    marginRight: "5px",
                    border: "1px solid #000",
                  }}
                ></span>
                {genusDisplayNames[genus] || genus}
              </label>
            ))}
          </div>
        </div>
    )
}

export default SpeciesFilter