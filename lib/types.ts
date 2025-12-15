/**
 * ===== STORYBOOK FRONTEND TYPE DEFINITIONS =====
 * Shared types for the StoryCanvas frontend application
 */

// ===== CHARACTER TYPES FOR MULTI-CHARACTER STORIES =====

/**
 * Character age categories with associated age ranges
 * Used for age-appropriate rendering and relative size calculations
 */
export type CharacterAge = 'toddler' | 'child' | 'teen' | 'young-adult' | 'adult' | 'senior';

/**
 * Character gender options for visual rendering
 */
export type CharacterGender = 'boy' | 'girl' | 'man' | 'woman' | 'non-binary';

/**
 * Character role in the story
 * - main: The cartoonized character (appears in 80%+ of panels)
 * - secondary: Described character (rendered by AI based on description)
 */
export type CharacterRole = 'main' | 'secondary';

/**
 * Relationship types between characters
 * Used to establish dynamics and relative positioning in scenes
 */
export type CharacterRelationship = 
  | 'sibling' 
  | 'parent' 
  | 'grandparent' 
  | 'friend' 
  | 'cousin' 
  | 'pet' 
  | 'teacher' 
  | 'neighbor';

/**
 * Hair color options for secondary characters
 */
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'gray' | 'white';

/**
 * Eye color options for secondary characters
 */
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel' | 'gray';

/**
 * Complete story character definition
 * Used for both main (cartoonized) and secondary (described) characters
 */
export interface StoryCharacter {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Required: Character name (used in story generation) */
  name: string;
  
  /** Required: Character age category */
  age: CharacterAge;
  
  /** Required: Character role in the story */
  role: CharacterRole;
  
  /** Required: Character gender for visual rendering */
  gender: CharacterGender;
  
  /** Optional: Relationship to main character (for secondary characters) */
  relationship?: CharacterRelationship;
  
  /** Optional: Hair color for secondary character descriptions */
  hairColor?: HairColor;
  
  /** Optional: Eye color for secondary character descriptions */
  eyeColor?: EyeColor;
  
  /** Only for main character: URL of the cartoonized image */
  cartoonImageUrl?: string;
  
  /** Only for main character: AI-generated character description from cartoonization */
  characterDescription?: string;
}

/**
 * Age display labels with descriptions
 * Used in UI for user-friendly age selection
 */
export const AGE_LABELS: Record<CharacterAge, string> = {
  'toddler': 'Toddler (1-3 years)',
  'child': 'Child (4-10 years)',
  'teen': 'Teen (11-17 years)',
  'young-adult': 'Young Adult (18-25 years)',
  'adult': 'Adult (26-55 years)',
  'senior': 'Senior (55+ years)'
};

/**
 * Gender display labels
 */
export const GENDER_LABELS: Record<CharacterGender, string> = {
  'girl': 'Girl',
  'boy': 'Boy',
  'woman': 'Woman',
  'man': 'Man',
  'non-binary': 'Non-binary'
};

/**
 * Relationship display labels
 */
export const RELATIONSHIP_LABELS: Record<CharacterRelationship, string> = {
  'sibling': 'Sibling (Brother/Sister)',
  'parent': 'Parent (Mom/Dad)',
  'grandparent': 'Grandparent',
  'friend': 'Friend',
  'cousin': 'Cousin',
  'pet': 'Pet',
  'teacher': 'Teacher',
  'neighbor': 'Neighbor'
};

/**
 * Hair color display labels
 */
export const HAIR_COLOR_LABELS: Record<HairColor, string> = {
  'black': 'Black',
  'brown': 'Brown',
  'blonde': 'Blonde',
  'red': 'Red/Auburn',
  'gray': 'Gray',
  'white': 'White'
};

/**
 * Eye color display labels
 */
export const EYE_COLOR_LABELS: Record<EyeColor, string> = {
  'brown': 'Brown',
  'blue': 'Blue',
  'green': 'Green',
  'hazel': 'Hazel',
  'gray': 'Gray'
};

/**
 * Create a default main character with empty values
 */
export function createDefaultMainCharacter(): StoryCharacter {
  return {
    id: crypto.randomUUID(),
    name: '',
    age: 'child',
    role: 'main',
    gender: 'boy',
  };
}

/**
 * Create a default secondary character with empty values
 */
export function createDefaultSecondaryCharacter(): StoryCharacter {
  return {
    id: crypto.randomUUID(),
    name: '',
    age: 'child',
    role: 'secondary',
    gender: 'boy',
  };
}

/**
 * Validate that a character has all required fields filled
 */
export function isCharacterValid(character: StoryCharacter): boolean {
  return (
    character.name.trim().length > 0 &&
    character.age.length > 0 &&
    character.gender.length > 0
  );
}

/**
 * Validate that all characters in array have required fields
 */
export function areAllCharactersValid(characters: StoryCharacter[]): boolean {
  return characters.length > 0 && characters.every(isCharacterValid);
}
