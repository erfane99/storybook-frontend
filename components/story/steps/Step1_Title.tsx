'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Star, User, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  StoryCharacter, 
  CharacterAge, 
  CharacterGender, 
  CharacterRelationship,
  HairColor,
  EyeColor,
  AGE_LABELS, 
  GENDER_LABELS, 
  RELATIONSHIP_LABELS,
  HAIR_COLOR_LABELS,
  EYE_COLOR_LABELS,
  createDefaultSecondaryCharacter 
} from '@/lib/types';

interface Step1_TitleProps {
  title: string;
  onTitleChange: (value: string) => void;
  characters: StoryCharacter[];
  onCharactersChange: (characters: StoryCharacter[]) => void;
}

export function Step1_Title({ 
  title, 
  onTitleChange, 
  characters, 
  onCharactersChange 
}: Step1_TitleProps) {
  
  // Update a specific character field
  const updateCharacter = (index: number, field: keyof StoryCharacter, value: any) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    onCharactersChange(updated);
  };

  // Add a new secondary character (max 4 total)
  const addCharacter = () => {
    if (characters.length < 4) {
      onCharactersChange([...characters, createDefaultSecondaryCharacter()]);
    }
  };

  // Remove a secondary character (keep at least 1)
  const removeCharacter = (index: number) => {
    if (characters.length > 1 && index > 0) {
      const updated = characters.filter((_, i) => i !== index);
      onCharactersChange(updated);
    }
  };

  const mainCharacter = characters[0];
  const secondaryCharacters = characters.slice(1);

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Step 1: Story Title & Characters</h3>
        <p className="text-muted-foreground mb-4">
          Give your story a title and define your characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Story Title *</Label>
        <Input
          id="title"
          placeholder="Enter your story title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="max-w-xl"
          autoFocus
        />
        {!title.trim() && (
          <p className="text-sm text-muted-foreground">
            Please enter a title to continue
          </p>
        )}
      </div>

      {/* Character Count Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Characters</Label>
          <p className="text-sm text-muted-foreground">
            {characters.length} character{characters.length > 1 ? 's' : ''} in your story
          </p>
        </div>
        {characters.length < 4 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCharacter}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Character
          </Button>
        )}
      </div>

      {/* Main Character Card */}
      <Card className="border-primary border-2 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            Main Character (will be cartoonized)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name - Required */}
          <div>
            <Label htmlFor="main-name">Name *</Label>
            <Input
              id="main-name"
              placeholder="Enter character name"
              value={mainCharacter?.name || ''}
              onChange={(e) => updateCharacter(0, 'name', e.target.value)}
            />
            {!mainCharacter?.name?.trim() && (
              <p className="text-sm text-destructive mt-1">Name is required</p>
            )}
          </div>
          
          {/* Age - Required */}
          <div>
            <Label htmlFor="main-age">Age *</Label>
            <Select 
              value={mainCharacter?.age || 'child'} 
              onValueChange={(val) => updateCharacter(0, 'age', val as CharacterAge)}
            >
              <SelectTrigger id="main-age">
                <SelectValue placeholder="Select age" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Gender - Required */}
          <div>
            <Label htmlFor="main-gender">Gender *</Label>
            <Select 
              value={mainCharacter?.gender || 'boy'} 
              onValueChange={(val) => updateCharacter(0, 'gender', val as CharacterGender)}
            >
              <SelectTrigger id="main-gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Character Cards */}
      {secondaryCharacters.map((character, idx) => {
        const characterIndex = idx + 1; // Actual index in the array
        
        return (
          <Card key={character.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Character {characterIndex + 1}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCharacter(characterIndex)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name - Required */}
              <div>
                <Label htmlFor={`char-${characterIndex}-name`}>Name *</Label>
                <Input
                  id={`char-${characterIndex}-name`}
                  placeholder="Enter character name"
                  value={character.name}
                  onChange={(e) => updateCharacter(characterIndex, 'name', e.target.value)}
                />
                {!character.name?.trim() && (
                  <p className="text-sm text-destructive mt-1">Name is required</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Age - Required */}
                <div>
                  <Label htmlFor={`char-${characterIndex}-age`}>Age *</Label>
                  <Select 
                    value={character.age} 
                    onValueChange={(val) => updateCharacter(characterIndex, 'age', val as CharacterAge)}
                  >
                    <SelectTrigger id={`char-${characterIndex}-age`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Gender - Required */}
                <div>
                  <Label htmlFor={`char-${characterIndex}-gender`}>Gender *</Label>
                  <Select 
                    value={character.gender} 
                    onValueChange={(val) => updateCharacter(characterIndex, 'gender', val as CharacterGender)}
                  >
                    <SelectTrigger id={`char-${characterIndex}-gender`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GENDER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Relationship to main character */}
              <div>
                <Label htmlFor={`char-${characterIndex}-relationship`}>
                  Relationship to {mainCharacter?.name || 'main character'}
                </Label>
                <Select 
                  value={character.relationship || ''} 
                  onValueChange={(val) => updateCharacter(characterIndex, 'relationship', val as CharacterRelationship)}
                >
                  <SelectTrigger id={`char-${characterIndex}-relationship`}>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Hair Color */}
                <div>
                  <Label htmlFor={`char-${characterIndex}-hair`}>Hair Color</Label>
                  <Select 
                    value={character.hairColor || ''} 
                    onValueChange={(val) => updateCharacter(characterIndex, 'hairColor', val as HairColor)}
                  >
                    <SelectTrigger id={`char-${characterIndex}-hair`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(HAIR_COLOR_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Eye Color */}
                <div>
                  <Label htmlFor={`char-${characterIndex}-eyes`}>Eye Color</Label>
                  <Select 
                    value={character.eyeColor || ''} 
                    onValueChange={(val) => updateCharacter(characterIndex, 'eyeColor', val as EyeColor)}
                  >
                    <SelectTrigger id={`char-${characterIndex}-eyes`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EYE_COLOR_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add Character Button (when no secondary characters yet) */}
      {secondaryCharacters.length === 0 && characters.length < 4 && (
        <button
          type="button"
          onClick={addCharacter}
          className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add another character (siblings, friends, family)
        </button>
      )}
    </div>
  );
}
