#!/usr/bin/env python3
"""
Works out each game's genres (Two Player, Platformer, Arcade, ...) from its title and system, and rewrites the
automatic list inside genres.ts. Run it after adding games:

    python3 tools/classify_genres.py secretv4-launcher-kit/site/src/data

Your manual fixes live in genreOverrides.ts and are never touched by this script.
The guesses are keyword based, so a few will be wrong. Fix them in genreOverrides.ts.
"""
import re, json, unicodedata, collections

import sys, os
D = (sys.argv[1] if len(sys.argv) > 1 else 'secretv4-launcher-kit/site/src/data').rstrip('/') + '/'
names={int(m.group(1)):m.group(2) for m in re.finditer(r'^\s*(\d+):\s*"((?:[^"\\]|\\.)*)"',open(D+'gameNames.ts').read(),re.M)}
games=[]   # (id, title, kind, system)
for g in json.load(open(D+'secretv4_games.json')):
    games.append((g['id'], names.get(g['id'],g.get('title','')), 'html', ''))
x=open(D+'extraGames.ts').read()
for i,t,k,s in re.findall(r'id:\s*(\d+),\s*title:\s*"((?:[^"\\]|\\.)*)",\s*kind:\s*\'(\w+)\',\s*system:\s*"((?:[^"\\]|\\.)*)"',x):
    games.append((int(i),t,k,s))
e=open(D+'eaglercraft.ts').read()
for i,t in re.findall(r'id:\s*(\d+),\s*title:\s*"((?:[^"\\]|\\.)*)"',e):
    games.append((int(i),t,'eaglercraft',''))

def norm(s):
    s=unicodedata.normalize('NFD',s.lower()); s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    return s.replace('’',"'")

GENRES=[('two-player','Two Player'),('platformer','Platformer'),('arcade','Arcade'),('simulator','Simulator'),('idle','Idle & Clicker'),
 ('shooter','Shooter'),('puzzle','Puzzle'),('racing','Racing'),('sports','Sports'),('rpg','RPG'),('fighting','Fighting'),('horror','Horror'),
 ('strategy','Strategy'),('sandbox','Sandbox & Survival'),('adventure','Adventure'),('board','Board & Card'),('io','.io & Online'),('rhythm','Rhythm & Music')]

R={}
R['two-player']=r"\b(2|two)[ -]?player|\b2p\b|\bbros\b|\brandom\b(?!.*(team|pok))|fireboy|watergirl|\bduel|versus|volley|table tennis|ping pong|\bpong\b|air hockey|puppet hockey|1 on 1|co-?op|\bcoop\b|smash bros|mario vs luigi|red vs\.? blue|sumo|arm wrestling|tag\b(?!.*(team))|snow bros|stick duels|supreme duelist|battle karts|smash karts|\bkarts?\b|shell shock|rocketgoal|ragdoll (archers|soccer|hit)|squid playground|tank trouble|boxhead 2play"
R['platformer']=r"\bmario\b(?!.*(kart|party|paint|golf|tennis|paper|luigi|missing|minigames mayhem))|\bmari0\b|sonic(?!.*pinball)|celeste|dadish|platformer|parkour|\bobby\b|\bobby ?\d|geometry dash|geometry vibes|\bpico\b(?!.*(life|night|hot))|i wanna|getting over it|level devil|big .*tower tiny|\bvex\b|dan the man|jazz jackrabbit|kirby|mega ?man(?!.*(star force|battle|legends))|castlevania|donkey kong|crash bandicoot|rayman|shantae|ristar|rocket knight|earthworm|aladdin|toejam|klonoa|yoshi|metroid|\bcontra\b|super c\b|ninja gaiden|prince of persia|red ball|dino run|tomb of the mask|only up|\bovo\b|one bit adventure|cave story|spelunky|pizza tower|cat mario|jelly mario|koopa|bad ice cream|cactus mccoy|alien hominid|achilles|jumping|jumper|bounce|super (onion|oliver|kid|falling)|just a platformer|dunk? no|steep|climb|unicycle|wheelie|hopper|ninja|ice climber|lode runner|karateka|shinobi|mobius|ghouls|duck life? no|duke nukem 2|abe's|another world|jump\b|elastic face|helix? no|stick (it)?"
R['arcade']=r"pac-?man|\bpong\b|\bsnake\b|snake like|tetris|breakout|asteroids|space invaders|flappy|\b2048\b|block blast|doodle jump|helix jump|stack ball|dunk shot|hextris|crossy road|fruit ninja|temple run|subway surfers|jetpack joyride|\bballz?\b|ball blast|centipede|galaga|arcade|puzzle bobble|plinko|suika|burrito bison|\btap\b|dodge|avoid|tunnel rush|rolling sky|\bslope\b|stacktris|snow rider|rooftop (run|snipers)|\brun\b|runner|surfers|dino|bubble shooter|pickleball? no|toasterball|balls and bricks|brick|ball (bounce|run)|going balls|sandtris|cannonballs|pinball|\bpou\b|pump|bounce|hole\.io|gold miner|knock knock"
R['simulator']=r"simulator|\bsim\b|\bsims\b|tycoon|\bfarm|garden|bitlife|\blife\b|manager|company|hotel|diner|\bshop\b|\bstore\b|stand\b|restaurant|cooking|burger|pizza|planet life|pet world|simcity|theme park|oregon trail|parking|flight|airline|taco|coffee|soda|banana|boba|\bpou\b|workout|office|mowing|cashier|bakery|barista|doctor|farmer|zoo|aquarium|fisquarium|monkey mart|perfect hotel|space company|hardware|processor|yandere|\bcity\b|town|build(er)?\b"
R['idle']=r"idle|clicker|incremental|cookie clicker|antimatter|adventure capitalist|cell to singularity|bit burner|leaf blower|per click|spacebar|prestige tree|\bngu\b|omega layers|\bclick|quantum|capybara|speed per click|doge miner|mr\.? mine|noob miner|coal llc|orb of creation|room clicker|revolution idle|ant art|mage tower idle|final earth|evolution$|growmi|grow a garden|grow your garden|feed the void|fluidism|cell machine"
R['shooter']=r"(?<!bubble )shooter|\bshoot|\bgun|sniper|\bfps\b|\bdoom|duke nukem|half-?life|counter[ -]?(snipe|strike)|\bcs\b|c\.s |cs:?go|battle ?royale|battlegrounds|bullet|zombie|call of|medal of honor|wolfenstein|quake|\bhalo\b|strike ?force|blockpost|krunker|recoil|hotline|postal|boxhead|goldeneye|rainbow six|time shooter|superhot|ultrakill|\bheretic|\bhacx|warfare|pixel (gun|combat|warfare)|neon blaster|brawl stars|trigger|touhou|\btank|bomber|space wars|armor mayhem|bad bodyguards|stickman and guns|10 (more )?bullets|apple shooter|codename gordon|raven base|guncho|leader strike|masked forces|national|mini shooters|counter snipe|getaway shootout|rooftop snipers|alien sky invasion|vampire survivors|survev|shot out|sniper|gunnight|gun knight|fortzone|cs 1\.6|metal slug|contra|super c\b|gunstar|\bblood\b(?! tourn)|\bquake"
R['puzzle']=r"puzzle|\b2048\b|tetris|block blast|sudoku|cut the rope|cuttherope|little alchemy|\bmatch\b|bejeweled|jewel|chuzzle|\bmaze\b|\bescape\b(?! road)|\btile\b|hextris|sokoban|cell machine|draw the line|intellisphere|fireboy|watergirl|bloxorz|crossword|\bword\b|wordle|minesweeper|bubble|suika|\bbridge\b|physics|riddle|brain|nuts and bolts|screw|\bsort\b|\bmerge\b|\blogic\b|connect|jigsaw|lemmings|picross|incredible machine|mean bean|puyo|columns|\bzen\b|resizer|trap the cat|thief puzzle|slice it|slice master|bottle|box? no|portal|cover orange|civiballs|cannon|bad piggies|angry birds|crazy penguin|hook|stack|stacktris|tower blocks|tower crash|balls? and bricks|flip|pull frog|sort the court|odd bot out|number factory|opposite day|plangman|hangman|trivia|zen word|mini crossword|lock the door|make sure it's closed|find the|spot|quiz|merge round|connect|block the pig|jelly|gubby? no"
R['racing']=r"\brac(e|er|ers|ing)\b|drift|\bcars?\b|\bkarts?\b|motocross|\bmoto\b|rally|driving|\bdrive\b|driver|\broad\b|roads\b|hill climb|eggy car|stunt|derby|need for speed|wipeout|f-?zero|gran turismo|twisted metal|top speed|speed stars|burnout|traffic|\btrucks?\b|\bbike|bicycle|jet ?ski|snowboard|\bski\b|\brider|sprinter|poly ?track|slow roads|rad racer|hot wheels|crazy cars|car king|mad skills|monster tracks|tail of the dragon|crash team racing|\bmx\b|bmx|offroad|wheelie|hover racer|sky race|survival race|blumgi racers|mountain bike|snow road|highway|retro highway|police pursuit|police chase|taxi|bus\b|ambulance|tracks?\b|dash|speed"
R['sports']=r"basketball|basket\b|football|soccer|baseball|\bgolf|boxing|tennis|volleyball|hockey|skate|\bnba\b|\bnfl\b|fifa|madden|\bnhl\b|\bmlb\b|\bwwe\b|wrestl|bowling|\bpool\b|billiard|archery|fishing|pickleball|rocket league|rocketgoal|tony hawk|punch.?out|tecmo|blitz|retro bowl|swimming|olympic|penalty|dunk|slam|\bpuck\b|ping pong|table tennis|cricket|rugby|sumo|2 on 2|1 on 1|backyard (baseball|soccer|football)|sports|athlete|\bgoal\b|striker|cheerleader|ragdoll soccer|axis football|world cup|slap|tag\b? no|side pocket|ken griffey|major league|karate bros|big shot boxing|ice fishing|tiny fishing|football bros|golf battle|uncanny cat golf|boxing random|stick archers|bowmasters|ragdoll archers|combo pool"
R['rpg']=r"\brpg\b|pokemon|\bquest\b|undertale|deltarune|final fantasy|zelda|dragon quest|paper mario|mario & luigi|earthbound|chrono|fire emblem|kingdom hearts|persona|shin megami|secret of mana|golden sun|fallout|elder scrolls|ultima|binding of isaac|vampire survivors|brotato|yume nikki|your turn to die|oneshot|doki doki|dungeon|\bknight|wizard|rogue|souls|diablo|\bmana\b|legend of|tales of|star force|battle network|legend of goku|advance wars? no|mother \d|lufia|breath of fire|suikoden|xenoblade|digimon|yokai|shantae? no|enchain|possess quest|die in the dungeon|dire decks|folder dungeon|curse of the lich king|hungry knight|neverending legacy|deepest sword|dungeon raid|endacopia|into ruins|legion breaker|hero\b|heroes|monster hunter|monster tale|ancient sins|brave|crown|kingdom|castle"
R['fighting']=r"fighter|fighting|mortal kombat|street fighter|smash bros|tekken|king of fighters|samurai shodown|darkstalkers|world heroes|fatal fury|last blade|killer instinct|soul ?calibur|dragon ball|\bbrawl|stick fight|stickman (kombat|duel|clash)|\bmugen\b|bleach vs|naruto|blood tournament|\bkarate|gladi|praxis fighter|gl fighters|stick duels|sword fight|ragdoll hit|svc chaos|x-men: children|hyper street|final fight|double dragon|streets of rage|golden axe|battletoads|ninja turtles|\btmnt\b|power battle|beat ?em|super tilt bros|supreme duelist|stick slasher|\bcombat\b|war of the|kombat|kombat"
R['horror']=r"fnaf|five nights|one night as freddy|horror|granny|baldi|backrooms|scary|haunted|\bdead\b|fears to fathom|nightmare|creep|slender|resident evil|bio evil|silent hill|\bevil\b|ghost|ben drowned|skinwalker|withered|purgatory|\bdoors\b|murder|\bdeath\b|\bblood\b|terror|\bfear|mimic|phasma|dread|\.exe|slendytubbies|lich king|spooky|halloween|tung sahur horror|the visitor|man from the window|trapped with jester|rabbit hole|pereelous|dark deception|dead (estate|seat|plate)|cold pines|deadly descent|hellron|insomniary|next door|mom i'm sleeping|vincent: mansion|pizzeria simulator|ultimate custom night|sister location|dream emulator|don't escape|abandoned|bear's? night|freddy|huggy wuggy|doki doki|undertale: last breath|scary teacher|schoolboy runaway|it gets so lonely|the end of disney|doom gallery|mansion|dying dreams|cheshire|seven days|six ways to die|haunt|\bcurse\b|nightmare"
R['strategy']=r"tower defen[cs]e|\btd\b|defen[cs]e|defend|strategy|command and conquer|age of|\bempire|\bcivil|conflict|castle wars|bloons|\bbtd|plants vs|\brts\b|kingdom|\bclash\b|stronghold|advance wars|tactics|lemmings|creeper world|territorial|state\.io|konkr|archesspelago|stick (defenders|war)|stickman (kingdom)|wars of|conquer|rise of|vikings|witchcraft td|pokepath td|mage tower|build-defend|stick merge|battle simulator|ages of|fortress|war the knight|space company|hardware|general|army|\bwar\b|\bwars\b|attack|invasion|battle"
R['sandbox']=r"minecraft|craft\b|sandbox|survival|terraria|infinite craft|melon playground|gmod|solar smash|sandboxels|townscraper|\bbuild|blocky|hypper|noob miner|eaglercraft|ahoy survival|night cat survival|survivor\.io|woodworm|solar sandbox|slow roads|webfishing|lucky blocks|waterworks|islander|forager|stardew|roblox|\bworld\b|planet|my teardrop|grindcraft|mine cart|mine shooter|hole\.io? no|fluid|physics|paintball? no"
R['adventure']=r"adventure|\bstory\b|mystery|\bescape\b|zelda|metroid|journey|odyssey|\blegend\b|explor|cave story|\bmyst\b|oregon trail|castaway|abandoned|amigo pancho|helltaker|a dark room|candy box|island|treasure|riddle|\bquest\b|temple|\bexpedition|voyage|lost|hidden|secret|ancient|mansion|detective|case\b|investigat|find the|\bgo to bed|there is no game|achievement unlocked|dad n me|decision|hungry lamu|baby chicco|kill the ice age|rabbit hole|pico\b"
R['board']=r"\bchess|checkers|\buno\b|blackjack|poker|solitaire|mahjong|roulette|backgammon|monopoly|scrabble|trivia|\bcards?\b|\bdeck\b|domino|bingo|slot|casino|gambl|wordle|crossword|mini crossword|connect ?4|tic.?tac.?toe|sudoku|\bgo fish|hearts\b|spades|rummy|battleship|clue\b|\bcluedo|sorry!?|ludo|trivia crack|push your luck|high stakes|russian (buckshot )?roulette|dungeon deck|creature card"
R['io']=r"\.io\b|\bio\b|multiplayer|\bonline\b|agar|slither|krunker|shell shockers|among us|gorilla tag|fall guys|territorial|surviv\.?io|kour|paper\.io|hole\.io|battlegrounds|yohoho|mope|zombs|deeeep|diep|tall\.io|stack ball\.io|hole battle|snowball\.io|waterpool|cleanup\.io|aquapark|survev|harvest\.io|growden|ducklings|state\.io|konkr|crazy cattle|smash karts|rocketgoal|blockpost|bloxd|town of|with friends|steal a brainrot|brainrot"
R['rhythm']=r"rhythm|dance of fire|friday night funkin|\bfnf\b|\bbeat|tempo|\bosu\b|guitar|melody|pico night punkin|\bdance|music|\bsong\b|piano|sprunki|incredibox|euroaural|just shapes|geometry dash|beatmania|parappa|funkin|silk melody|\bbop\b|karaoke|samba|drum"


# ---- tightening after review: drop generic words that caused wrong labels, add precise ones ----
def drop(g, *tokens):
    for t in tokens:
        if ('|'+t) in R[g]: R[g] = R[g].replace('|'+t, '', 1)
        elif R[g].startswith(t+'|'): R[g] = R[g][len(t)+1:]
        else: pass
def add(g, extra): R[g] = R[g] + '|' + extra

drop('shooter', 'trigger', r'\btank', 'bomber', 'national')
add('shooter', r'johnny trigger|\btanks?\b(?!.*(bubble))|grand theft auto|\bgta\b|007|spiderman? no'.replace('|spiderman? no',''))
drop('strategy', 'attack', 'battle', r'\bwar\b', r'\bwars\b', 'general', 'army', 'fortress', 'invasion', 'kingdom')
add('strategy', r'kingdom rush|stickman kingdom|shining force|age of war|battle for|\barmy\b(?=.*(men|tactics))|command & conquer')
drop('sandbox', r'\bworld\b', 'planet', 'physics', r'\bbuild', 'fluid')
add('sandbox', r'\bbuild(ing)? (a|your)|build now|buildnow')
drop('horror', r'\bcurse\b', 'mansion', 'abandoned')
add('horror', r'vincent: mansion|unabandoned|abandoned$')
drop('simulator', 'zoo', 'pizza', 'hotel', r'stand\b', r'\blife\b', 'town', 'office', r'\bcity\b', r'build(er)?\b')
add('simulator', r'\bzoo\b|perfect hotel|airline|short life|eugene.s life|pico life|planet life|\bcity (builder|simulator)|my (little )?(shop|restaurant|farm)|day in the office')
drop('arcade', r'\bballz?\b', 'bounce', 'pump', 'knock knock', r'hole\.io', 'dodge')
add('arcade', r'\bballz\b|ball blast|\bcount masters|rocketpult|pogo|dodge|peggle')
drop('puzzle', 'bottle', 'flip', 'jelly', 'brain', 'hook', 'bubble', 'stack', 'spot', 'quiz', 'portal', 'cannon', 'connect', 'merge round', 'zen', r'\bmerge\b')
add('puzzle', r'\bbrain (out|test|age)|bubble (shooter|pop|spinner)|\bpull frog|\bmerge (master|puzzle|fruit)|\bportal 2d|factory balls|wheely|bloons? pack no'.replace('|bloons? pack no',''))
drop('racing', 'dash', 'speed', r'\broad\b', 'highway', 'tracks?\\b', 'taxi', r'bus\b')
add('racing', r'speed stars|top speed|road rash|\broad\b(?=.*(race|rush|fury|rage))|moto road|retro highway|taxi|\bbus (simulator|driver|parking)')
drop('rpg', 'hero\\b', 'heroes', 'crown', 'castle', 'brave', r'\bquest\b', 'kingdom', r'\bhero\b') if False else None
for t in ['hero\\b','heroes','crown','castle','brave',r'\bquest\b','kingdom']:
    if ('|'+t) in R['rpg']: R['rpg']=R['rpg'].replace('|'+t,'',1)
add('rpg', r'dragon quest|possess quest|quest for|\bpoke|phantasy star|shining force|bomberman hero? no'.replace('|bomberman hero? no',''))
drop('adventure', r'pico\b', r'\bsecret\b', 'lost', 'hidden', 'ancient', 'case\\b', 'mansion', 'detective', 'investigat', 'find the')
add('adventure', r'grand theft auto|\bgta\b|\b007\b|spider-?man|metal gear|scuba bear|detective|lost levels')
drop('board', r'hearts\b', 'spades', r'clue\b', r'sorry!?', 'high stakes')
add('board', r'\bhearts (card|game)')
drop('rhythm', 'tempo', r'\bdance')
add('rhythm', r'\btempo\b|\bdance\b|dancing|dance of fire')
R['shooter'] = R['shooter'].replace(r'(?<!bubble )shooter|\bshoot', r'(?<!bubble )\bshoot').replace('|zombie', r'|(?<!vs )(?<!vs\. )zombie', 1)
R['platformer'] = R['platformer'].replace('|stick (it)?', '')
# two-player: "Super Mario Bros" is not a two-player game
R['two-player'] = R['two-player'].replace(r'\bbros\b', r'(?<!mario )\bbros\b', 1)

import re as _re
for _g in R: R[_g]=_re.sub(r"\|[^|()]*\?\s*no(?=[|)]|$)","",R[_g])
RC={g:re.compile(p) for g,p in R.items()}

NOT_POKEMON_GENRES={'two-player','sports','io','arcade','simulator','idle'}
SYSTEM_DEFAULT={'Arcade':['arcade'],'Pokémon GB/GBA':['rpg'],'Atari 2600':['arcade'],'Jaguar':['arcade'],'Lynx':['arcade'],'ColecoVision':['arcade'],'Virtual Boy':['arcade'],'C64':['arcade'],'Neo Geo Pocket':['arcade'],'WonderSwan':['arcade']}

def classify(i,title,kind,system):
    t=norm(title)
    out=[]
    if kind=='eaglercraft': return ['sandbox','io']
    pokemon = t.startswith('pokemon')
    for gid,_ in GENRES:
        if pokemon and gid in NOT_POKEMON_GENRES: continue
        if RC[gid].search(t): out.append(gid)
    for g in SYSTEM_DEFAULT.get(system,[]):
        if g not in out: out.append(g)
    if pokemon and 'rpg' not in out: out.append('rpg')
    return out


def write_genres_ts():
    res = {i: classify(i, t, k, s) for i, t, k, s in games}
    ids = sorted(i for i, v in res.items() if v)
    lines = "\n".join("  %d: [%s]," % (i, ', '.join("'%s'" % g for g in res[i])) for i in ids)
    path = D + 'genres.ts'
    old = open(path, encoding='utf-8').read()
    a = old.index("const autoGenres: Record<number, GenreId[]> = {\n") + len("const autoGenres: Record<number, GenreId[]> = {\n")
    b = old.index("\n};\n\n/** The genres of a game")
    open(path, 'w', encoding='utf-8').write(old[:a] + lines + old[b:])
    print('Wrote %d games with at least one genre (of %d) to %s' % (len(ids), len(res), path))

if __name__ == '__main__':
    write_genres_ts()
