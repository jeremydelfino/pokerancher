-- Two species ids did not match the French name shown next to them: "Vipélierre" is
-- Snivy (not Victreebel) and "Mysdibule" is Mawile (not Hoopa). Left alone, enabling
-- real artwork would render the wrong creature for anyone already owning them.
-- Neither target id existed before this migration, so no unique (userId, speciesId)
-- collision is possible.
UPDATE "PokemonUnit" SET "speciesId" = 'snivy' WHERE "speciesId" = 'victreebel';
UPDATE "PokemonUnit" SET "speciesId" = 'mawile' WHERE "speciesId" = 'hoopa';
