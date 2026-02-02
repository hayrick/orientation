
export interface Student {
  id: string; // Brand<string, 'StudentId'> could be used for strict typing
  specialties: [string, string]; // Tuple of exactly 2 specialties
  averageGrade: number; // 0-20
}
