/**
 * Spieler-Daten für die 12 Hauptteams der WM 2026
 * Realistische Kader mit Marktwerten, Alters- und Rating-Daten
 */

export interface Player {
  id: string
  teamId: string
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  age: number
  marketValueM: number
  clubTeam?: string
  xGPer90?: number
  xGAPer90?: number
  isInStartingXI: boolean
  jerseyNumber?: number
  rating: number
  nationality?: string
}

const PLAYERS: Player[] = [
  // ─── DEUTSCHLAND ──────────────────────────────────────────────────────────
  { id: 'ger_1', teamId: 'germany', name: 'Marc-André ter Stegen', position: 'GK', age: 33, marketValueM: 22, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 1, rating: 85 },
  { id: 'ger_2', teamId: 'germany', name: 'Oliver Baumann', position: 'GK', age: 34, marketValueM: 3, clubTeam: 'TSG Hoffenheim', isInStartingXI: false, jerseyNumber: 12, rating: 72 },
  { id: 'ger_3', teamId: 'germany', name: 'Jonathan Tah', position: 'DEF', age: 30, marketValueM: 35, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 4, rating: 82 },
  { id: 'ger_4', teamId: 'germany', name: 'Nico Schlotterbeck', position: 'DEF', age: 26, marketValueM: 42, clubTeam: 'Borussia Dortmund', isInStartingXI: true, jerseyNumber: 5, rating: 82 },
  { id: 'ger_5', teamId: 'germany', name: 'Maximilian Mittelstädt', position: 'DEF', age: 27, marketValueM: 25, clubTeam: 'VfB Stuttgart', isInStartingXI: true, jerseyNumber: 3, rating: 78 },
  { id: 'ger_6', teamId: 'germany', name: 'Joshua Kimmich', position: 'MID', age: 31, marketValueM: 55, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 6, rating: 89, xGAPer90: 0.22 },
  { id: 'ger_7', teamId: 'germany', name: 'Robert Andrich', position: 'MID', age: 30, marketValueM: 30, clubTeam: 'Bayer Leverkusen', isInStartingXI: true, jerseyNumber: 23, rating: 80 },
  { id: 'ger_8', teamId: 'germany', name: 'Florian Wirtz', position: 'MID', age: 22, marketValueM: 130, clubTeam: 'Bayer Leverkusen', isInStartingXI: true, jerseyNumber: 10, rating: 91, xGPer90: 0.31, xGAPer90: 0.38 },
  { id: 'ger_9', teamId: 'germany', name: 'Jamal Musiala', position: 'MID', age: 22, marketValueM: 120, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 14, rating: 90, xGPer90: 0.28, xGAPer90: 0.32 },
  { id: 'ger_10', teamId: 'germany', name: 'Leroy Sané', position: 'FWD', age: 30, marketValueM: 35, clubTeam: 'FC Bayern München', isInStartingXI: false, jerseyNumber: 19, rating: 82, xGPer90: 0.22 },
  { id: 'ger_11', teamId: 'germany', name: 'Kai Havertz', position: 'FWD', age: 26, marketValueM: 65, clubTeam: 'Arsenal FC', isInStartingXI: true, jerseyNumber: 7, rating: 84, xGPer90: 0.25 },
  { id: 'ger_12', teamId: 'germany', name: 'Niclas Füllkrug', position: 'FWD', age: 32, marketValueM: 30, clubTeam: 'West Ham United', isInStartingXI: false, jerseyNumber: 9, rating: 80, xGPer90: 0.42 },
  { id: 'ger_13', teamId: 'germany', name: 'Serge Gnabry', position: 'FWD', age: 30, marketValueM: 25, clubTeam: 'FC Bayern München', isInStartingXI: false, jerseyNumber: 20, rating: 78, xGPer90: 0.20 },
  { id: 'ger_14', teamId: 'germany', name: 'Antonio Rüdiger', position: 'DEF', age: 33, marketValueM: 18, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 2, rating: 83 },
  { id: 'ger_15', teamId: 'germany', name: 'Pascal Groß', position: 'MID', age: 33, marketValueM: 15, clubTeam: 'Borussia Dortmund', isInStartingXI: false, jerseyNumber: 8, rating: 76 },

  // ─── FRANKREICH ───────────────────────────────────────────────────────────
  { id: 'fra_1', teamId: 'france', name: 'Mike Maignan', position: 'GK', age: 29, marketValueM: 55, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 16, rating: 88 },
  { id: 'fra_2', teamId: 'france', name: 'William Saliba', position: 'DEF', age: 25, marketValueM: 100, clubTeam: 'Arsenal FC', isInStartingXI: true, jerseyNumber: 17, rating: 88 },
  { id: 'fra_3', teamId: 'france', name: 'Dayot Upamecano', position: 'DEF', age: 27, marketValueM: 55, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 4, rating: 85 },
  { id: 'fra_4', teamId: 'france', name: 'Théo Hernandez', position: 'DEF', age: 27, marketValueM: 60, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 22, rating: 86, xGAPer90: 0.15 },
  { id: 'fra_5', teamId: 'france', name: 'Jules Koundé', position: 'DEF', age: 27, marketValueM: 65, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 5, rating: 85 },
  { id: 'fra_6', teamId: 'france', name: 'Aurélien Tchouaméni', position: 'MID', age: 26, marketValueM: 80, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 8, rating: 86 },
  { id: 'fra_7', teamId: 'france', name: 'Eduardo Camavinga', position: 'MID', age: 23, marketValueM: 100, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 14, rating: 86 },
  { id: 'fra_8', teamId: 'france', name: 'Antoine Griezmann', position: 'MID', age: 35, marketValueM: 15, clubTeam: 'Atlético Madrid', isInStartingXI: false, jerseyNumber: 7, rating: 84, xGPer90: 0.28, xGAPer90: 0.22 },
  { id: 'fra_9', teamId: 'france', name: 'Kylian Mbappé', position: 'FWD', age: 27, marketValueM: 180, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 10, rating: 95, xGPer90: 0.62, xGAPer90: 0.28 },
  { id: 'fra_10', teamId: 'france', name: 'Ousmane Dembélé', position: 'FWD', age: 29, marketValueM: 55, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 11, rating: 86, xGPer90: 0.32, xGAPer90: 0.30 },
  { id: 'fra_11', teamId: 'france', name: 'Marcus Thuram', position: 'FWD', age: 28, marketValueM: 75, clubTeam: 'Inter Milan', isInStartingXI: true, jerseyNumber: 9, rating: 86, xGPer90: 0.38 },
  { id: 'fra_12', teamId: 'france', name: 'Randal Kolo Muani', position: 'FWD', age: 27, marketValueM: 45, clubTeam: 'Juventus', isInStartingXI: false, jerseyNumber: 19, rating: 80, xGPer90: 0.25 },
  { id: 'fra_13', teamId: 'france', name: 'N\'Golo Kanté', position: 'MID', age: 35, marketValueM: 12, clubTeam: 'Al-Ittihad', isInStartingXI: false, jerseyNumber: 13, rating: 80 },
  { id: 'fra_14', teamId: 'france', name: 'Adrien Rabiot', position: 'MID', age: 31, marketValueM: 25, clubTeam: 'OM', isInStartingXI: false, jerseyNumber: 15, rating: 78 },
  { id: 'fra_15', teamId: 'france', name: 'Bradley Barcola', position: 'FWD', age: 23, marketValueM: 80, clubTeam: 'PSG', isInStartingXI: false, jerseyNumber: 26, rating: 82, xGPer90: 0.26 },

  // ─── SPANIEN ──────────────────────────────────────────────────────────────
  { id: 'esp_1', teamId: 'spain', name: 'Unai Simón', position: 'GK', age: 28, marketValueM: 35, clubTeam: 'Athletic Bilbao', isInStartingXI: true, jerseyNumber: 23, rating: 84 },
  { id: 'esp_2', teamId: 'spain', name: 'Dani Carvajal', position: 'DEF', age: 33, marketValueM: 15, clubTeam: 'Real Madrid', isInStartingXI: false, jerseyNumber: 2, rating: 80 },
  { id: 'esp_3', teamId: 'spain', name: 'Robin Le Normand', position: 'DEF', age: 28, marketValueM: 45, clubTeam: 'Atlético Madrid', isInStartingXI: true, jerseyNumber: 14, rating: 83 },
  { id: 'esp_4', teamId: 'spain', name: 'Aymeric Laporte', position: 'DEF', age: 32, marketValueM: 18, clubTeam: 'Al-Nassr', isInStartingXI: false, jerseyNumber: 24, rating: 80 },
  { id: 'esp_5', teamId: 'spain', name: 'Marc Cucurella', position: 'DEF', age: 26, marketValueM: 45, clubTeam: 'Chelsea FC', isInStartingXI: true, jerseyNumber: 3, rating: 82 },
  { id: 'esp_6', teamId: 'spain', name: 'Pedri', position: 'MID', age: 23, marketValueM: 120, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 26, rating: 89, xGAPer90: 0.20 },
  { id: 'esp_7', teamId: 'spain', name: 'Rodri', position: 'MID', age: 29, marketValueM: 150, clubTeam: 'Manchester City', isInStartingXI: true, jerseyNumber: 16, rating: 93 },
  { id: 'esp_8', teamId: 'spain', name: 'Fabián Ruiz', position: 'MID', age: 28, marketValueM: 65, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 8, rating: 84 },
  { id: 'esp_9', teamId: 'spain', name: 'Lamine Yamal', position: 'FWD', age: 18, marketValueM: 180, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 19, rating: 90, xGPer90: 0.30, xGAPer90: 0.35 },
  { id: 'esp_10', teamId: 'spain', name: 'Nico Williams', position: 'FWD', age: 22, marketValueM: 120, clubTeam: 'Athletic Bilbao', isInStartingXI: true, jerseyNumber: 17, rating: 88, xGPer90: 0.28, xGAPer90: 0.30 },
  { id: 'esp_11', teamId: 'spain', name: 'Álvaro Morata', position: 'FWD', age: 33, marketValueM: 18, clubTeam: 'AC Milan', isInStartingXI: false, jerseyNumber: 7, rating: 79, xGPer90: 0.30 },
  { id: 'esp_12', teamId: 'spain', name: 'Dani Olmo', position: 'MID', age: 27, marketValueM: 75, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 10, rating: 87, xGPer90: 0.22, xGAPer90: 0.25 },
  { id: 'esp_13', teamId: 'spain', name: 'Mikel Merino', position: 'MID', age: 28, marketValueM: 65, clubTeam: 'Arsenal FC', isInStartingXI: false, jerseyNumber: 6, rating: 82 },
  { id: 'esp_14', teamId: 'spain', name: 'Alejandro Balde', position: 'DEF', age: 22, marketValueM: 70, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 11, rating: 82 },
  { id: 'esp_15', teamId: 'spain', name: 'Joselu', position: 'FWD', age: 34, marketValueM: 8, clubTeam: 'Real Madrid', isInStartingXI: false, jerseyNumber: 9, rating: 74, xGPer90: 0.38 },

  // ─── ENGLAND ──────────────────────────────────────────────────────────────
  { id: 'eng_1', teamId: 'england', name: 'Jordan Pickford', position: 'GK', age: 32, marketValueM: 25, clubTeam: 'Everton FC', isInStartingXI: true, jerseyNumber: 1, rating: 86 },
  { id: 'eng_2', teamId: 'england', name: 'Kyle Walker', position: 'DEF', age: 36, marketValueM: 8, clubTeam: 'Manchester City', isInStartingXI: false, jerseyNumber: 2, rating: 78 },
  { id: 'eng_3', teamId: 'england', name: 'John Stones', position: 'DEF', age: 32, marketValueM: 35, clubTeam: 'Manchester City', isInStartingXI: true, jerseyNumber: 5, rating: 84 },
  { id: 'eng_4', teamId: 'england', name: 'Harry Maguire', position: 'DEF', age: 33, marketValueM: 18, clubTeam: 'Manchester United', isInStartingXI: false, jerseyNumber: 6, rating: 76 },
  { id: 'eng_5', teamId: 'england', name: 'Trent Alexander-Arnold', position: 'DEF', age: 28, marketValueM: 80, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 12, rating: 88, xGAPer90: 0.22 },
  { id: 'eng_6', teamId: 'england', name: 'Declan Rice', position: 'MID', age: 27, marketValueM: 100, clubTeam: 'Arsenal FC', isInStartingXI: true, jerseyNumber: 4, rating: 88 },
  { id: 'eng_7', teamId: 'england', name: 'Jude Bellingham', position: 'MID', age: 22, marketValueM: 180, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 22, rating: 93, xGPer90: 0.28, xGAPer90: 0.32 },
  { id: 'eng_8', teamId: 'england', name: 'Phil Foden', position: 'MID', age: 26, marketValueM: 130, clubTeam: 'Manchester City', isInStartingXI: true, jerseyNumber: 11, rating: 90, xGPer90: 0.26, xGAPer90: 0.28 },
  { id: 'eng_9', teamId: 'england', name: 'Bukayo Saka', position: 'FWD', age: 25, marketValueM: 150, clubTeam: 'Arsenal FC', isInStartingXI: true, jerseyNumber: 7, rating: 91, xGPer90: 0.34, xGAPer90: 0.38 },
  { id: 'eng_10', teamId: 'england', name: 'Harry Kane', position: 'FWD', age: 33, marketValueM: 70, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 9, rating: 90, xGPer90: 0.55 },
  { id: 'eng_11', teamId: 'england', name: 'Marcus Rashford', position: 'FWD', age: 28, marketValueM: 60, clubTeam: 'Manchester United', isInStartingXI: false, jerseyNumber: 10, rating: 81, xGPer90: 0.22 },
  { id: 'eng_12', teamId: 'england', name: 'Anthony Gordon', position: 'FWD', age: 24, marketValueM: 75, clubTeam: 'Newcastle United', isInStartingXI: false, jerseyNumber: 14, rating: 80 },
  { id: 'eng_13', teamId: 'england', name: 'Conor Gallagher', position: 'MID', age: 25, marketValueM: 55, clubTeam: 'Atlético Madrid', isInStartingXI: false, jerseyNumber: 16, rating: 78 },
  { id: 'eng_14', teamId: 'england', name: 'Luke Shaw', position: 'DEF', age: 30, marketValueM: 25, clubTeam: 'Manchester United', isInStartingXI: true, jerseyNumber: 3, rating: 80 },
  { id: 'eng_15', teamId: 'england', name: 'Ollie Watkins', position: 'FWD', age: 30, marketValueM: 65, clubTeam: 'Aston Villa', isInStartingXI: false, jerseyNumber: 15, rating: 82, xGPer90: 0.38 },

  // ─── BRASILIEN ────────────────────────────────────────────────────────────
  { id: 'bra_1', teamId: 'brazil', name: 'Alisson Becker', position: 'GK', age: 33, marketValueM: 40, clubTeam: 'Liverpool FC', isInStartingXI: true, jerseyNumber: 1, rating: 88 },
  { id: 'bra_2', teamId: 'brazil', name: 'Danilo', position: 'DEF', age: 34, marketValueM: 10, clubTeam: 'Juventus', isInStartingXI: false, jerseyNumber: 2, rating: 76 },
  { id: 'bra_3', teamId: 'brazil', name: 'Marquinhos', position: 'DEF', age: 31, marketValueM: 45, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 4, rating: 86 },
  { id: 'bra_4', teamId: 'brazil', name: 'Gabriel Magalhães', position: 'DEF', age: 27, marketValueM: 75, clubTeam: 'Arsenal FC', isInStartingXI: true, jerseyNumber: 3, rating: 85 },
  { id: 'bra_5', teamId: 'brazil', name: 'Alex Sandro', position: 'DEF', age: 35, marketValueM: 5, clubTeam: 'unattached', isInStartingXI: false, jerseyNumber: 12, rating: 70 },
  { id: 'bra_6', teamId: 'brazil', name: 'Casemiro', position: 'MID', age: 34, marketValueM: 20, clubTeam: 'Manchester United', isInStartingXI: false, jerseyNumber: 5, rating: 79 },
  { id: 'bra_7', teamId: 'brazil', name: 'Bruno Guimarães', position: 'MID', age: 27, marketValueM: 90, clubTeam: 'Newcastle United', isInStartingXI: true, jerseyNumber: 15, rating: 87 },
  { id: 'bra_8', teamId: 'brazil', name: 'Lucas Paquetá', position: 'MID', age: 27, marketValueM: 65, clubTeam: 'West Ham United', isInStartingXI: true, jerseyNumber: 10, rating: 85, xGPer90: 0.15, xGAPer90: 0.22 },
  { id: 'bra_9', teamId: 'brazil', name: 'Vinicius Jr.', position: 'FWD', age: 25, marketValueM: 200, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 7, rating: 94, xGPer90: 0.45, xGAPer90: 0.32 },
  { id: 'bra_10', teamId: 'brazil', name: 'Rodrygo', position: 'FWD', age: 24, marketValueM: 120, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 11, rating: 88, xGPer90: 0.28, xGAPer90: 0.25 },
  { id: 'bra_11', teamId: 'brazil', name: 'Raphinha', position: 'FWD', age: 29, marketValueM: 65, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 19, rating: 84, xGPer90: 0.25 },
  { id: 'bra_12', teamId: 'brazil', name: 'Endrick', position: 'FWD', age: 18, marketValueM: 80, clubTeam: 'Real Madrid', isInStartingXI: false, jerseyNumber: 18, rating: 80, xGPer90: 0.32 },
  { id: 'bra_13', teamId: 'brazil', name: 'Neymar Jr.', position: 'FWD', age: 34, marketValueM: 15, clubTeam: 'Al-Hilal', isInStartingXI: false, jerseyNumber: 10, rating: 82, xGPer90: 0.30 },
  { id: 'bra_14', teamId: 'brazil', name: 'Militão', position: 'DEF', age: 27, marketValueM: 70, clubTeam: 'Real Madrid', isInStartingXI: true, jerseyNumber: 14, rating: 86 },
  { id: 'bra_15', teamId: 'brazil', name: 'Gerson', position: 'MID', age: 28, marketValueM: 35, clubTeam: 'OM', isInStartingXI: false, jerseyNumber: 8, rating: 79 },

  // ─── ARGENTINIEN ──────────────────────────────────────────────────────────
  { id: 'arg_1', teamId: 'argentina', name: 'Emiliano Martínez', position: 'GK', age: 32, marketValueM: 40, clubTeam: 'Aston Villa', isInStartingXI: true, jerseyNumber: 23, rating: 90 },
  { id: 'arg_2', teamId: 'argentina', name: 'Nahuel Molina', position: 'DEF', age: 27, marketValueM: 35, clubTeam: 'Atlético Madrid', isInStartingXI: true, jerseyNumber: 26, rating: 80 },
  { id: 'arg_3', teamId: 'argentina', name: 'Cristian Romero', position: 'DEF', age: 27, marketValueM: 65, clubTeam: 'Tottenham Hotspur', isInStartingXI: true, jerseyNumber: 13, rating: 86 },
  { id: 'arg_4', teamId: 'argentina', name: 'Lisandro Martínez', position: 'DEF', age: 27, marketValueM: 70, clubTeam: 'Manchester United', isInStartingXI: true, jerseyNumber: 25, rating: 87 },
  { id: 'arg_5', teamId: 'argentina', name: 'Nicolás Tagliafico', position: 'DEF', age: 32, marketValueM: 12, clubTeam: 'Olympique Lyon', isInStartingXI: true, jerseyNumber: 3, rating: 77 },
  { id: 'arg_6', teamId: 'argentina', name: 'Rodrigo De Paul', position: 'MID', age: 31, marketValueM: 35, clubTeam: 'Atlético Madrid', isInStartingXI: true, jerseyNumber: 7, rating: 83 },
  { id: 'arg_7', teamId: 'argentina', name: 'Alexis Mac Allister', position: 'MID', age: 26, marketValueM: 80, clubTeam: 'Liverpool FC', isInStartingXI: true, jerseyNumber: 20, rating: 87, xGPer90: 0.14 },
  { id: 'arg_8', teamId: 'argentina', name: 'Enzo Fernández', position: 'MID', age: 25, marketValueM: 100, clubTeam: 'Chelsea FC', isInStartingXI: true, jerseyNumber: 24, rating: 86 },
  { id: 'arg_9', teamId: 'argentina', name: 'Lautaro Martínez', position: 'FWD', age: 27, marketValueM: 100, clubTeam: 'Inter Milan', isInStartingXI: true, jerseyNumber: 22, rating: 90, xGPer90: 0.48 },
  { id: 'arg_10', teamId: 'argentina', name: 'Julián Álvarez', position: 'FWD', age: 25, marketValueM: 90, clubTeam: 'Atlético Madrid', isInStartingXI: true, jerseyNumber: 9, rating: 87, xGPer90: 0.38, xGAPer90: 0.18 },
  { id: 'arg_11', teamId: 'argentina', name: 'Ángel Di María', position: 'FWD', age: 38, marketValueM: 3, clubTeam: 'Benfica', isInStartingXI: false, jerseyNumber: 11, rating: 78, xGPer90: 0.15 },
  { id: 'arg_12', teamId: 'argentina', name: 'Paulo Dybala', position: 'FWD', age: 32, marketValueM: 20, clubTeam: 'AS Roma', isInStartingXI: false, jerseyNumber: 21, rating: 82, xGPer90: 0.25 },
  { id: 'arg_13', teamId: 'argentina', name: 'Leandro Paredes', position: 'MID', age: 31, marketValueM: 15, clubTeam: 'AS Roma', isInStartingXI: false, jerseyNumber: 5, rating: 78 },
  { id: 'arg_14', teamId: 'argentina', name: 'Alejandro Garnacho', position: 'FWD', age: 21, marketValueM: 75, clubTeam: 'Manchester United', isInStartingXI: false, jerseyNumber: 17, rating: 81, xGPer90: 0.22 },
  { id: 'arg_15', teamId: 'argentina', name: 'Germán Pezzella', position: 'DEF', age: 34, marketValueM: 4, clubTeam: 'Real Betis', isInStartingXI: false, jerseyNumber: 6, rating: 73 },

  // ─── PORTUGAL ─────────────────────────────────────────────────────────────
  { id: 'por_1', teamId: 'portugal', name: 'Diogo Costa', position: 'GK', age: 26, marketValueM: 50, clubTeam: 'FC Porto', isInStartingXI: true, jerseyNumber: 1, rating: 84 },
  { id: 'por_2', teamId: 'portugal', name: 'João Cancelo', position: 'DEF', age: 32, marketValueM: 25, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 20, rating: 82 },
  { id: 'por_3', teamId: 'portugal', name: 'Rúben Dias', position: 'DEF', age: 28, marketValueM: 85, clubTeam: 'Manchester City', isInStartingXI: true, jerseyNumber: 4, rating: 89 },
  { id: 'por_4', teamId: 'portugal', name: 'António Silva', position: 'DEF', age: 22, marketValueM: 60, clubTeam: 'Benfica', isInStartingXI: true, jerseyNumber: 3, rating: 83 },
  { id: 'por_5', teamId: 'portugal', name: 'Nuno Mendes', position: 'DEF', age: 23, marketValueM: 55, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 19, rating: 83 },
  { id: 'por_6', teamId: 'portugal', name: 'Vitinha', position: 'MID', age: 25, marketValueM: 75, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 16, rating: 85 },
  { id: 'por_7', teamId: 'portugal', name: 'Bruno Fernandes', position: 'MID', age: 31, marketValueM: 80, clubTeam: 'Manchester United', isInStartingXI: true, jerseyNumber: 8, rating: 88, xGPer90: 0.22, xGAPer90: 0.32 },
  { id: 'por_8', teamId: 'portugal', name: 'João Neves', position: 'MID', age: 21, marketValueM: 80, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 14, rating: 83 },
  { id: 'por_9', teamId: 'portugal', name: 'Rafael Leão', position: 'FWD', age: 26, marketValueM: 100, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 11, rating: 88, xGPer90: 0.30, xGAPer90: 0.25 },
  { id: 'por_10', teamId: 'portugal', name: 'Gonçalo Ramos', position: 'FWD', age: 24, marketValueM: 65, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 9, rating: 84, xGPer90: 0.42 },
  { id: 'por_11', teamId: 'portugal', name: 'Cristiano Ronaldo', position: 'FWD', age: 41, marketValueM: 5, clubTeam: 'Al-Nassr', isInStartingXI: false, jerseyNumber: 7, rating: 78, xGPer90: 0.40 },
  { id: 'por_12', teamId: 'portugal', name: 'Bernardo Silva', position: 'MID', age: 31, marketValueM: 80, clubTeam: 'Manchester City', isInStartingXI: false, jerseyNumber: 10, rating: 88, xGPer90: 0.18, xGAPer90: 0.22 },
  { id: 'por_13', teamId: 'portugal', name: 'Pedro Neto', position: 'FWD', age: 25, marketValueM: 65, clubTeam: 'Chelsea FC', isInStartingXI: false, jerseyNumber: 17, rating: 82, xGPer90: 0.20 },
  { id: 'por_14', teamId: 'portugal', name: 'William Carvalho', position: 'MID', age: 33, marketValueM: 8, clubTeam: 'Real Betis', isInStartingXI: false, jerseyNumber: 14, rating: 75 },
  { id: 'por_15', teamId: 'portugal', name: 'Pepe', position: 'DEF', age: 43, marketValueM: 1, clubTeam: 'FC Porto', isInStartingXI: false, jerseyNumber: 3, rating: 68 },

  // ─── NIEDERLANDE ──────────────────────────────────────────────────────────
  { id: 'ned_1', teamId: 'netherlands', name: 'Mark Flekken', position: 'GK', age: 31, marketValueM: 18, clubTeam: 'Brentford FC', isInStartingXI: true, jerseyNumber: 1, rating: 81 },
  { id: 'ned_2', teamId: 'netherlands', name: 'Denzel Dumfries', position: 'DEF', age: 29, marketValueM: 38, clubTeam: 'Inter Milan', isInStartingXI: true, jerseyNumber: 22, rating: 81 },
  { id: 'ned_3', teamId: 'netherlands', name: 'Virgil van Dijk', position: 'DEF', age: 35, marketValueM: 20, clubTeam: 'Liverpool FC', isInStartingXI: true, jerseyNumber: 4, rating: 85 },
  { id: 'ned_4', teamId: 'netherlands', name: 'Stefan de Vrij', position: 'DEF', age: 33, marketValueM: 12, clubTeam: 'Inter Milan', isInStartingXI: false, jerseyNumber: 6, rating: 79 },
  { id: 'ned_5', teamId: 'netherlands', name: 'Nathan Aké', position: 'DEF', age: 30, marketValueM: 38, clubTeam: 'Manchester City', isInStartingXI: true, jerseyNumber: 5, rating: 82 },
  { id: 'ned_6', teamId: 'netherlands', name: 'Frenkie de Jong', position: 'MID', age: 29, marketValueM: 65, clubTeam: 'FC Barcelona', isInStartingXI: true, jerseyNumber: 21, rating: 86 },
  { id: 'ned_7', teamId: 'netherlands', name: 'Tijjani Reijnders', position: 'MID', age: 27, marketValueM: 65, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 14, rating: 84 },
  { id: 'ned_8', teamId: 'netherlands', name: 'Xavi Simons', position: 'MID', age: 22, marketValueM: 100, clubTeam: 'RB Leipzig', isInStartingXI: true, jerseyNumber: 7, rating: 86, xGPer90: 0.20, xGAPer90: 0.18 },
  { id: 'ned_9', teamId: 'netherlands', name: 'Cody Gakpo', position: 'FWD', age: 26, marketValueM: 75, clubTeam: 'Liverpool FC', isInStartingXI: true, jerseyNumber: 11, rating: 85, xGPer90: 0.32 },
  { id: 'ned_10', teamId: 'netherlands', name: 'Memphis Depay', position: 'FWD', age: 31, marketValueM: 12, clubTeam: 'Corinthians', isInStartingXI: false, jerseyNumber: 10, rating: 76, xGPer90: 0.25 },
  { id: 'ned_11', teamId: 'netherlands', name: 'Wout Weghorst', position: 'FWD', age: 33, marketValueM: 10, clubTeam: 'Besiktas', isInStartingXI: false, jerseyNumber: 19, rating: 74, xGPer90: 0.28 },
  { id: 'ned_12', teamId: 'netherlands', name: 'Donyell Malen', position: 'FWD', age: 27, marketValueM: 35, clubTeam: 'Borussia Dortmund', isInStartingXI: false, jerseyNumber: 17, rating: 79, xGPer90: 0.22 },
  { id: 'ned_13', teamId: 'netherlands', name: 'Marten de Roon', position: 'MID', age: 33, marketValueM: 10, clubTeam: 'Atalanta', isInStartingXI: false, jerseyNumber: 15, rating: 76 },
  { id: 'ned_14', teamId: 'netherlands', name: 'Ian Maatsen', position: 'DEF', age: 23, marketValueM: 35, clubTeam: 'Aston Villa', isInStartingXI: false, jerseyNumber: 3, rating: 78 },
  { id: 'ned_15', teamId: 'netherlands', name: 'Brian Brobbey', position: 'FWD', age: 23, marketValueM: 35, clubTeam: 'Ajax', isInStartingXI: true, jerseyNumber: 9, rating: 80, xGPer90: 0.35 },

  // ─── USA ──────────────────────────────────────────────────────────────────
  { id: 'usa_1', teamId: 'usa', name: 'Matt Turner', position: 'GK', age: 30, marketValueM: 8, clubTeam: 'Crystal Palace', isInStartingXI: true, jerseyNumber: 1, rating: 76 },
  { id: 'usa_2', teamId: 'usa', name: 'Sergiño Dest', position: 'DEF', age: 25, marketValueM: 15, clubTeam: 'PSV Eindhoven', isInStartingXI: false, jerseyNumber: 2, rating: 73 },
  { id: 'usa_3', teamId: 'usa', name: 'Chris Richards', position: 'DEF', age: 25, marketValueM: 20, clubTeam: 'Crystal Palace', isInStartingXI: true, jerseyNumber: 4, rating: 74 },
  { id: 'usa_4', teamId: 'usa', name: 'Tim Ream', position: 'DEF', age: 37, marketValueM: 3, clubTeam: 'Charlotte FC', isInStartingXI: false, jerseyNumber: 13, rating: 70 },
  { id: 'usa_5', teamId: 'usa', name: 'Antonee Robinson', position: 'DEF', age: 28, marketValueM: 28, clubTeam: 'Fulham FC', isInStartingXI: true, jerseyNumber: 3, rating: 78 },
  { id: 'usa_6', teamId: 'usa', name: 'Tyler Adams', position: 'MID', age: 26, marketValueM: 25, clubTeam: 'AFC Bournemouth', isInStartingXI: true, jerseyNumber: 4, rating: 79 },
  { id: 'usa_7', teamId: 'usa', name: 'Weston McKennie', position: 'MID', age: 26, marketValueM: 22, clubTeam: 'Leeds United', isInStartingXI: true, jerseyNumber: 8, rating: 77 },
  { id: 'usa_8', teamId: 'usa', name: 'Yunus Musah', position: 'MID', age: 23, marketValueM: 30, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 6, rating: 76 },
  { id: 'usa_9', teamId: 'usa', name: 'Christian Pulisic', position: 'FWD', age: 27, marketValueM: 45, clubTeam: 'AC Milan', isInStartingXI: true, jerseyNumber: 10, rating: 82, xGPer90: 0.28, xGAPer90: 0.20 },
  { id: 'usa_10', teamId: 'usa', name: 'Ricardo Pepi', position: 'FWD', age: 23, marketValueM: 20, clubTeam: 'PSV Eindhoven', isInStartingXI: true, jerseyNumber: 9, rating: 76, xGPer90: 0.30 },
  { id: 'usa_11', teamId: 'usa', name: 'Giovanni Reyna', position: 'MID', age: 23, marketValueM: 25, clubTeam: 'Borussia Dortmund', isInStartingXI: false, jerseyNumber: 7, rating: 76, xGPer90: 0.18 },
  { id: 'usa_12', teamId: 'usa', name: 'Timothy Weah', position: 'FWD', age: 25, marketValueM: 20, clubTeam: 'Juventus', isInStartingXI: true, jerseyNumber: 21, rating: 75, xGPer90: 0.18 },
  { id: 'usa_13', teamId: 'usa', name: 'Folarin Balogun', position: 'FWD', age: 24, marketValueM: 22, clubTeam: 'Monaco', isInStartingXI: false, jerseyNumber: 11, rating: 74, xGPer90: 0.25 },
  { id: 'usa_14', teamId: 'usa', name: 'Luca de la Torre', position: 'MID', age: 27, marketValueM: 8, clubTeam: 'Celta Vigo', isInStartingXI: false, jerseyNumber: 16, rating: 70 },
  { id: 'usa_15', teamId: 'usa', name: 'DeAndre Yedlin', position: 'DEF', age: 33, marketValueM: 2, clubTeam: 'Inter Miami', isInStartingXI: false, jerseyNumber: 2, rating: 66 },

  // ─── MEXIKO ───────────────────────────────────────────────────────────────
  { id: 'mex_1', teamId: 'mexico', name: 'Guillermo Ochoa', position: 'GK', age: 40, marketValueM: 2, clubTeam: 'Club América', isInStartingXI: true, jerseyNumber: 13, rating: 74 },
  { id: 'mex_2', teamId: 'mexico', name: 'Jorge Sánchez', position: 'DEF', age: 27, marketValueM: 8, clubTeam: 'FC Porto', isInStartingXI: true, jerseyNumber: 23, rating: 71 },
  { id: 'mex_3', teamId: 'mexico', name: 'César Montes', position: 'DEF', age: 28, marketValueM: 8, clubTeam: 'Espanyol', isInStartingXI: true, jerseyNumber: 3, rating: 72 },
  { id: 'mex_4', teamId: 'mexico', name: 'Johan Vásquez', position: 'DEF', age: 26, marketValueM: 10, clubTeam: 'Genoa', isInStartingXI: true, jerseyNumber: 15, rating: 71 },
  { id: 'mex_5', teamId: 'mexico', name: 'Jesús Gallardo', position: 'DEF', age: 29, marketValueM: 5, clubTeam: 'Monterrey', isInStartingXI: false, jerseyNumber: 3, rating: 69 },
  { id: 'mex_6', teamId: 'mexico', name: 'Edson Álvarez', position: 'MID', age: 28, marketValueM: 35, clubTeam: 'West Ham United', isInStartingXI: true, jerseyNumber: 18, rating: 78 },
  { id: 'mex_7', teamId: 'mexico', name: 'Andrés Guardado', position: 'MID', age: 38, marketValueM: 1, clubTeam: 'Club León', isInStartingXI: false, jerseyNumber: 18, rating: 68 },
  { id: 'mex_8', teamId: 'mexico', name: 'Carlos Rodríguez', position: 'MID', age: 27, marketValueM: 12, clubTeam: 'Cruz Azul', isInStartingXI: true, jerseyNumber: 6, rating: 72 },
  { id: 'mex_9', teamId: 'mexico', name: 'Hirving "Chucky" Lozano', position: 'FWD', age: 31, marketValueM: 15, clubTeam: 'PSV Eindhoven', isInStartingXI: true, jerseyNumber: 22, rating: 78, xGPer90: 0.22 },
  { id: 'mex_10', teamId: 'mexico', name: 'Raúl Jiménez', position: 'FWD', age: 34, marketValueM: 8, clubTeam: 'Fulham FC', isInStartingXI: true, jerseyNumber: 9, rating: 74, xGPer90: 0.28 },
  { id: 'mex_11', teamId: 'mexico', name: 'Roberto Alvarado', position: 'MID', age: 26, marketValueM: 12, clubTeam: 'Guadalajara', isInStartingXI: true, jerseyNumber: 14, rating: 73 },
  { id: 'mex_12', teamId: 'mexico', name: 'Santiago Giménez', position: 'FWD', age: 24, marketValueM: 28, clubTeam: 'Feyenoord', isInStartingXI: false, jerseyNumber: 19, rating: 76, xGPer90: 0.38 },
  { id: 'mex_13', teamId: 'mexico', name: 'Henry Martín', position: 'FWD', age: 32, marketValueM: 5, clubTeam: 'Club América', isInStartingXI: false, jerseyNumber: 7, rating: 71 },
  { id: 'mex_14', teamId: 'mexico', name: 'Alexis Vega', position: 'FWD', age: 27, marketValueM: 6, clubTeam: 'Guadalajara', isInStartingXI: false, jerseyNumber: 17, rating: 70 },
  { id: 'mex_15', teamId: 'mexico', name: 'Luis Romo', position: 'MID', age: 30, marketValueM: 6, clubTeam: 'Cruz Azul', isInStartingXI: false, jerseyNumber: 16, rating: 70 },

  // ─── JAPAN ────────────────────────────────────────────────────────────────
  { id: 'jpn_1', teamId: 'japan', name: 'Shuichi Gonda', position: 'GK', age: 32, marketValueM: 4, clubTeam: 'Shimizu S-Pulse', isInStartingXI: true, jerseyNumber: 12, rating: 72 },
  { id: 'jpn_2', teamId: 'japan', name: 'Hiroki Sakai', position: 'DEF', age: 34, marketValueM: 2, clubTeam: 'Urawa Red Diamonds', isInStartingXI: false, jerseyNumber: 19, rating: 70 },
  { id: 'jpn_3', teamId: 'japan', name: 'Ko Itakura', position: 'DEF', age: 27, marketValueM: 15, clubTeam: 'Borussia M\'gladbach', isInStartingXI: true, jerseyNumber: 16, rating: 76 },
  { id: 'jpn_4', teamId: 'japan', name: 'Maya Yoshida', position: 'DEF', age: 37, marketValueM: 1, clubTeam: 'FC Machida Zelvia', isInStartingXI: false, jerseyNumber: 22, rating: 68 },
  { id: 'jpn_5', teamId: 'japan', name: 'Yuto Nagatomo', position: 'DEF', age: 38, marketValueM: 1, clubTeam: 'FC Tokyo', isInStartingXI: false, jerseyNumber: 5, rating: 65 },
  { id: 'jpn_6', teamId: 'japan', name: 'Wataru Endo', position: 'MID', age: 32, marketValueM: 15, clubTeam: 'Liverpool FC', isInStartingXI: true, jerseyNumber: 17, rating: 79 },
  { id: 'jpn_7', teamId: 'japan', name: 'Daichi Kamada', position: 'MID', age: 29, marketValueM: 22, clubTeam: 'Crystal Palace', isInStartingXI: true, jerseyNumber: 9, rating: 81, xGPer90: 0.18 },
  { id: 'jpn_8', teamId: 'japan', name: 'Ao Tanaka', position: 'MID', age: 27, marketValueM: 18, clubTeam: 'Borussia Dortmund', isInStartingXI: true, jerseyNumber: 3, rating: 79 },
  { id: 'jpn_9', teamId: 'japan', name: 'Kaoru Mitoma', position: 'FWD', age: 28, marketValueM: 60, clubTeam: 'Brighton & Hove Albion', isInStartingXI: true, jerseyNumber: 10, rating: 83, xGPer90: 0.28, xGAPer90: 0.22 },
  { id: 'jpn_10', teamId: 'japan', name: 'Takefusa Kubo', position: 'FWD', age: 24, marketValueM: 60, clubTeam: 'Real Sociedad', isInStartingXI: true, jerseyNumber: 8, rating: 82, xGPer90: 0.22, xGAPer90: 0.18 },
  { id: 'jpn_11', teamId: 'japan', name: 'Ayase Ueda', position: 'FWD', age: 26, marketValueM: 18, clubTeam: 'Feyenoord', isInStartingXI: true, jerseyNumber: 11, rating: 78, xGPer90: 0.38 },
  { id: 'jpn_12', teamId: 'japan', name: 'Ritsu Doan', position: 'FWD', age: 27, marketValueM: 22, clubTeam: 'SC Freiburg', isInStartingXI: false, jerseyNumber: 21, rating: 78, xGPer90: 0.20 },
  { id: 'jpn_13', teamId: 'japan', name: 'Hiroki Ito', position: 'DEF', age: 26, marketValueM: 30, clubTeam: 'FC Bayern München', isInStartingXI: true, jerseyNumber: 4, rating: 78 },
  { id: 'jpn_14', teamId: 'japan', name: 'Keito Nakamura', position: 'FWD', age: 23, marketValueM: 20, clubTeam: 'Stade Reims', isInStartingXI: false, jerseyNumber: 18, rating: 74 },
  { id: 'jpn_15', teamId: 'japan', name: 'Takehiro Tomiyasu', position: 'DEF', age: 27, marketValueM: 28, clubTeam: 'Arsenal FC', isInStartingXI: false, jerseyNumber: 6, rating: 78 },

  // ─── MAROKKO ──────────────────────────────────────────────────────────────
  { id: 'mar_1', teamId: 'morocco', name: 'Yassine Bounou', position: 'GK', age: 34, marketValueM: 18, clubTeam: 'Al-Hilal', isInStartingXI: true, jerseyNumber: 1, rating: 86 },
  { id: 'mar_2', teamId: 'morocco', name: 'Achraf Hakimi', position: 'DEF', age: 28, marketValueM: 80, clubTeam: 'PSG', isInStartingXI: true, jerseyNumber: 2, rating: 89, xGAPer90: 0.18 },
  { id: 'mar_3', teamId: 'morocco', name: 'Romain Saïss', position: 'DEF', age: 35, marketValueM: 3, clubTeam: 'Besiktas', isInStartingXI: false, jerseyNumber: 5, rating: 74 },
  { id: 'mar_4', teamId: 'morocco', name: 'Nayef Aguerd', position: 'DEF', age: 29, marketValueM: 22, clubTeam: 'West Ham United', isInStartingXI: true, jerseyNumber: 6, rating: 79 },
  { id: 'mar_5', teamId: 'morocco', name: 'Noussair Mazraoui', position: 'DEF', age: 28, marketValueM: 30, clubTeam: 'Manchester United', isInStartingXI: true, jerseyNumber: 12, rating: 80 },
  { id: 'mar_6', teamId: 'morocco', name: 'Sofyan Amrabat', position: 'MID', age: 29, marketValueM: 28, clubTeam: 'Fiorentina', isInStartingXI: true, jerseyNumber: 4, rating: 82 },
  { id: 'mar_7', teamId: 'morocco', name: 'Azzedine Ounahi', position: 'MID', age: 25, marketValueM: 22, clubTeam: 'OM', isInStartingXI: true, jerseyNumber: 8, rating: 79 },
  { id: 'mar_8', teamId: 'morocco', name: 'Selim Amallah', position: 'MID', age: 28, marketValueM: 12, clubTeam: 'Standard Liège', isInStartingXI: false, jerseyNumber: 14, rating: 74 },
  { id: 'mar_9', teamId: 'morocco', name: 'Hakim Ziyech', position: 'FWD', age: 33, marketValueM: 12, clubTeam: 'Galatasaray', isInStartingXI: true, jerseyNumber: 7, rating: 81, xGPer90: 0.18, xGAPer90: 0.22 },
  { id: 'mar_10', teamId: 'morocco', name: 'Youssef En-Nesyri', position: 'FWD', age: 29, marketValueM: 25, clubTeam: 'Sevilla FC', isInStartingXI: true, jerseyNumber: 9, rating: 80, xGPer90: 0.32 },
  { id: 'mar_11', teamId: 'morocco', name: 'Sofiane Boufal', position: 'FWD', age: 31, marketValueM: 10, clubTeam: 'Angers SCO', isInStartingXI: false, jerseyNumber: 11, rating: 76, xGPer90: 0.15 },
  { id: 'mar_12', teamId: 'morocco', name: 'Abdessamad Ezzalzouli', position: 'FWD', age: 24, marketValueM: 20, clubTeam: 'Real Betis', isInStartingXI: true, jerseyNumber: 17, rating: 78, xGPer90: 0.18 },
  { id: 'mar_13', teamId: 'morocco', name: 'Ibrahim Diaz', position: 'FWD', age: 24, marketValueM: 15, clubTeam: 'AC Milan', isInStartingXI: false, jerseyNumber: 19, rating: 74 },
  { id: 'mar_14', teamId: 'morocco', name: 'Bilal El Khannouss', position: 'MID', age: 21, marketValueM: 22, clubTeam: 'Genk', isInStartingXI: false, jerseyNumber: 16, rating: 76 },
  { id: 'mar_15', teamId: 'morocco', name: 'Yahia Attiat-Allah', position: 'DEF', age: 29, marketValueM: 8, clubTeam: 'Zamalek', isInStartingXI: true, jerseyNumber: 3, rating: 73 },
]

export default PLAYERS

export const PLAYERS_BY_TEAM: Record<string, Player[]> = PLAYERS.reduce(
  (acc, player) => {
    if (!acc[player.teamId]) acc[player.teamId] = []
    acc[player.teamId].push(player)
    return acc
  },
  {} as Record<string, Player[]>
)

export const STARTING_XI_BY_TEAM: Record<string, Player[]> = PLAYERS.reduce(
  (acc, player) => {
    if (player.isInStartingXI) {
      if (!acc[player.teamId]) acc[player.teamId] = []
      acc[player.teamId].push(player)
    }
    return acc
  },
  {} as Record<string, Player[]>
)

/**
 * Parser für Copy-Paste-Import von Kader-Daten
 * Unterstützt verschiedene Formate:
 * "1. Marc-André ter Stegen GK 33 Barcelona 40M"
 * "Toni Kroos | MID | 34 | Real Madrid | €60M"
 */
export function parseSquadText(text: string, teamId: string): Partial<Player>[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const players: Partial<Player>[] = []

  for (const line of lines) {
    const player = parsePlayerLine(line.trim(), teamId)
    if (player) players.push(player)
  }

  return players
}

function parsePlayerLine(line: string, teamId: string): Partial<Player> | null {
  // Skip header lines
  if (/^(nr|pos|name|player|squad|#)/i.test(line)) return null

  // Format: Number. Name Position Age Club Value
  const format1 = /^(\d+)\.\s+(.+?)\s+(GK|DEF|MID|FWD)\s+(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*M?$/i
  // Format: Name | Position | Age | Club | Value
  const format2 = /^(.+?)\s*\|\s*(GK|DEF|MID|FWD)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|.*?(\d+(?:\.\d+)?)/i
  // Format: Number Name Position Age Club
  const format3 = /^(\d+)\s+(.+?)\s+(GK|DEF|MID|FWD)\s+(\d+)/i

  let match = line.match(format1)
  if (match) {
    return {
      teamId,
      jerseyNumber: parseInt(match[1]),
      name: match[2].trim(),
      position: match[3].toUpperCase() as Player['position'],
      age: parseInt(match[4]),
      clubTeam: match[5].trim(),
      marketValueM: parseFloat(match[6]),
      rating: 70,
      isInStartingXI: false,
    }
  }

  match = line.match(format2)
  if (match) {
    return {
      teamId,
      name: match[1].trim(),
      position: match[2].toUpperCase() as Player['position'],
      age: parseInt(match[3]),
      clubTeam: match[4].trim(),
      marketValueM: parseFloat(match[5]),
      rating: 70,
      isInStartingXI: false,
    }
  }

  match = line.match(format3)
  if (match) {
    return {
      teamId,
      jerseyNumber: parseInt(match[1]),
      name: match[2].trim(),
      position: match[3].toUpperCase() as Player['position'],
      age: parseInt(match[4]),
      rating: 70,
      isInStartingXI: false,
    }
  }

  return null
}
