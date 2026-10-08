// Task templates and the mission task generator.
//
// Every mission's objectives are generated from these predefined lists based
// on room, duration and the chores the crew picked. Dependency rule: clearer
// tasks never depend on anyone; cleaner tasks may depend on clearer tasks;
// finisher tasks may depend on clearer or cleaner tasks. Dependencies whose
// prerequisite isn't in the mission (role not picked, or task sliced out by
// duration) are nulled at generation, so any subset of roles is safe.

import type { Role, RoomKey } from "./gameTypes";
import { ROOM_DURATIONS } from "./gameTypes";

export const ROLE_ORDER: Role[] = ["clearer", "cleaner", "finisher"];

interface TaskTemplate {
  key: string;
  title: string;
  detail: string;
  after?: string; // key of the prerequisite task (teamwork unlock)
}

type RoomTasks = Record<Role, TaskTemplate[]>;

const KITCHEN: RoomTasks = {
  clearer: [
    {
      key: "clear-counters",
      title: "Clear the counters",
      detail:
        "Remove everything that doesn't belong on the kitchen counters. Put each item where it actually lives — no shuffling piles.",
    },
    {
      key: "dish-roundup",
      title: "Dish roundup",
      detail:
        "Collect every stray cup, plate and utensil from around the house and stack them next to the sink.",
    },
    {
      key: "clear-table",
      title: "Clear the kitchen table",
      detail:
        "Take everything off the table — mail, keys, chargers, bags — and deliver each item to its home.",
    },
    {
      key: "stow-food",
      title: "Stow loose food",
      detail:
        "Return snacks, sauces, and ingredients to the pantry and fridge. Seal anything left open.",
    },
    {
      key: "clear-floor-k",
      title: "Rescue the floor",
      detail:
        "Pick up anything on the kitchen floor that isn't furniture: bags, boxes, pet bowls that moved, mystery items.",
    },
  ],
  cleaner: [
    {
      key: "wipe-counters",
      title: "Wipe the cleared counters",
      detail:
        "Spray and wipe down every counter the Clearer has emptied. Corners and edges count.",
      after: "clear-counters",
    },
    {
      key: "shine-sink",
      title: "Scrub and shine the sink",
      detail:
        "Load the dishwasher or wash the stack, then scrub the basin and faucet until they shine.",
      after: "dish-roundup",
    },
    {
      key: "wipe-table",
      title: "Wipe down the table",
      detail: "Wipe the cleared kitchen table top and edges until it's spotless.",
      after: "clear-table",
    },
    {
      key: "wipe-stove",
      title: "Degrease the stovetop",
      detail:
        "Wipe the stovetop, knobs and the splash zone behind it. Dried sauce is the enemy.",
    },
    {
      key: "wipe-appliances",
      title: "Wipe the appliance fleet",
      detail:
        "Wipe the microwave (inside too), kettle, toaster and the fridge door handles.",
    },
  ],
  finisher: [
    {
      key: "trash-run",
      title: "Take out the trash",
      detail:
        "Bag the kitchen trash, take it out, and fit a fresh liner. Recycling goes too.",
    },
    {
      key: "sweep-kitchen",
      title: "Sweep the kitchen floor",
      detail: "Sweep or vacuum the whole kitchen floor, including under the table.",
      after: "clear-floor-k",
    },
    {
      key: "towel-reset",
      title: "Reset towels and soap",
      detail:
        "Hang a fresh hand towel, refill the dish soap, and square up the sponge station.",
      after: "shine-sink",
    },
    {
      key: "table-stage",
      title: "Stage the table",
      detail:
        "Tuck in the chairs, center anything that belongs on the table, and square it all up.",
      after: "wipe-table",
    },
    {
      key: "final-pass-k",
      title: "Final inspection pass",
      detail:
        "One slow lap of the kitchen. Anything out of place goes home. Call it when it looks like a showroom.",
      after: "wipe-counters",
    },
  ],
};

const LIVING: RoomTasks = {
  clearer: [
    {
      key: "clear-tables-l",
      title: "Clear the coffee table",
      detail:
        "Remove everything from the coffee table and side tables that doesn't live there. Deliver items to their homes.",
    },
    {
      key: "clutter-basket",
      title: "Clutter basket pass",
      detail:
        "Grab a basket or bag and sweep the room for anything that belongs in another room. Deliver it all.",
    },
    {
      key: "sofa-dig",
      title: "Excavate the sofa",
      detail:
        "Remotes, chargers, snacks and laundry off the sofa. Fold the blankets, pile the cushions.",
    },
    {
      key: "clear-floor-l",
      title: "Clear the floor",
      detail:
        "Pick up shoes, toys, bags and anything else living on the floor that shouldn't be.",
    },
    {
      key: "tame-cables",
      title: "Tame the cables",
      detail:
        "Coil chargers, dock the controllers, and line up whatever lives near the TV.",
    },
  ],
  cleaner: [
    {
      key: "wipe-tables-l",
      title: "Wipe the cleared tables",
      detail: "Wipe the coffee table and side tables the Clearer just emptied.",
      after: "clear-tables-l",
    },
    {
      key: "dust-screen",
      title: "Dust the screen zone",
      detail: "Dust the TV screen, stand and console with a dry cloth.",
    },
    {
      key: "sofa-reset",
      title: "Reset the sofa",
      detail:
        "Fluff and square the cushions, drape the folded throw, make it look like a catalog.",
      after: "sofa-dig",
    },
    {
      key: "dust-shelves",
      title: "Dust shelves and sills",
      detail: "Quick dust pass over shelves, window sills and picture frames.",
    },
    {
      key: "spot-clean-l",
      title: "Spot-clean touch points",
      detail:
        "Wipe fingerprints off glass, door handles and light switches around the room.",
    },
  ],
  finisher: [
    {
      key: "trash-pass-l",
      title: "Trash and cup patrol",
      detail:
        "Collect trash, wrappers and stray cups from the room. Cups to the kitchen, trash out.",
    },
    {
      key: "floor-finish-l",
      title: "Vacuum the floor",
      detail: "Vacuum or sweep the main floor area and under the coffee table.",
      after: "clear-floor-l",
    },
    {
      key: "stage-decor",
      title: "Stage the surfaces",
      detail:
        "Square up books, candles and plants on the cleaned tables. Make it intentional.",
      after: "wipe-tables-l",
    },
    {
      key: "pillow-final",
      title: "Final sofa staging",
      detail: "Final pillow chop and throw placement. The sofa should invite applause.",
      after: "sofa-reset",
    },
    {
      key: "lap-of-honor",
      title: "Lap of honor",
      detail:
        "One slow lap of the room. Fix anything that breaks the vibe, then set the lighting.",
    },
  ],
};

const BEDROOM: RoomTasks = {
  clearer: [
    {
      key: "clear-nightstands",
      title: "Clear the nightstands",
      detail:
        "Remove cups, wrappers and clutter from both nightstands. Keep only what belongs.",
    },
    {
      key: "clothes-triage",
      title: "Clothes triage",
      detail:
        "Every loose garment gets a verdict: dirty to the hamper, clean to a folded pile or hanger.",
    },
    {
      key: "clear-bed",
      title: "Clear the bed",
      detail:
        "Everything off the bed that isn't bedding — laptops, laundry, books, cats excluded.",
    },
    {
      key: "clear-floor-b",
      title: "Clear the floor",
      detail: "Shoes, bags and floor-drobe items picked up and put where they live.",
    },
    {
      key: "clear-dresser",
      title: "Clear the dresser top",
      detail:
        "Reset the dresser surface: stray items home, keep only the things that live there.",
    },
  ],
  cleaner: [
    {
      key: "make-bed",
      title: "Make the bed properly",
      detail:
        "Smooth the sheets, square the duvet, stack the pillows. Hotel-tight if you can.",
      after: "clear-bed",
    },
    {
      key: "wipe-nightstands",
      title: "Wipe the nightstands",
      detail: "Dust and wipe both cleared nightstands, lamp bases included.",
      after: "clear-nightstands",
    },
    {
      key: "dust-dresser",
      title: "Dust the dresser",
      detail: "Dust and wipe the cleared dresser top and the mirror above it.",
      after: "clear-dresser",
    },
    {
      key: "mirror-shine",
      title: "Shine the mirror",
      detail: "Clean the mirror and any glass until it's streak-free.",
    },
    {
      key: "fresh-air",
      title: "Reset the air",
      detail:
        "Crack a window for fresh air, straighten the curtains or blinds to match.",
    },
  ],
  finisher: [
    {
      key: "hamper-run",
      title: "Hamper run",
      detail: "Take the hamper to the laundry zone and empty the bedroom trash.",
      after: "clothes-triage",
    },
    {
      key: "floor-finish-b",
      title: "Finish the floor",
      detail: "Vacuum or sweep the bedroom floor, under-bed edges included.",
      after: "clear-floor-b",
    },
    {
      key: "closet-check",
      title: "Closet check-in",
      detail:
        "Put the folded pile and hangers properly away. Close every drawer and door.",
      after: "clothes-triage",
    },
    {
      key: "stage-nightstands",
      title: "Stage the nightstands",
      detail:
        "Lamp, book, glass of water. Make each nightstand look deliberate.",
      after: "wipe-nightstands",
    },
    {
      key: "final-walkthrough-b",
      title: "Final walkthrough",
      detail:
        "One lap of the room. Straighten anything crooked, then dim the lights for effect.",
      after: "make-bed",
    },
  ],
};

const WHOLE: RoomTasks = {
  clearer: [
    {
      key: "entry-reset",
      title: "Reset the entryway",
      detail:
        "Shoes paired and racked, coats hung, mail and keys to their homes. First impressions matter.",
    },
    {
      key: "surface-blitz",
      title: "Surface blitz",
      detail:
        "Move room to room clearing every main surface — tables, counters, desks. Items go home, not into piles.",
    },
    {
      key: "dish-rodeo",
      title: "Dish rodeo",
      detail:
        "Hunt down every stray dish, cup and glass in the house and corral them by the kitchen sink.",
    },
    {
      key: "floor-rescue",
      title: "Floor rescue",
      detail:
        "Pick up everything living on the floors of the main rooms: shoes, bags, toys, laundry.",
    },
    {
      key: "counter-clear",
      title: "Clear the kitchen counters",
      detail:
        "Everything that doesn't belong on the kitchen counters gets delivered to its home.",
    },
  ],
  cleaner: [
    {
      key: "wipe-blitz",
      title: "Wipe the cleared surfaces",
      detail:
        "Follow the Clearer's path and wipe down every surface they emptied.",
      after: "surface-blitz",
    },
    {
      key: "kitchen-shine",
      title: "Shine the kitchen",
      detail: "Wipe the cleared counters and scrub the sink until it gleams.",
      after: "counter-clear",
    },
    {
      key: "bathroom-flash",
      title: "Three-minute bathroom flash",
      detail:
        "Quick wipe of the bathroom sink, faucet and mirror. Fresh hand towel up.",
    },
    {
      key: "sofa-squad",
      title: "Sofa and soft reset",
      detail: "Cushions squared, throws folded, beds smoothed in each room you pass.",
    },
    {
      key: "touch-points",
      title: "Wipe the touch points",
      detail: "Door handles, light switches and fridge handles — wipe them all.",
    },
  ],
  finisher: [
    {
      key: "trash-tour",
      title: "Trash tour",
      detail:
        "Empty every bin in the house into one bag, take it out, re-line the big ones.",
    },
    {
      key: "floor-finish-w",
      title: "Finish the floors",
      detail: "Quick vacuum or sweep of the main walkways and high-traffic spots.",
      after: "floor-rescue",
    },
    {
      key: "dish-finish",
      title: "Run the dishwasher",
      detail:
        "Load the corralled dishes, start the dishwasher or wash the stack.",
      after: "dish-rodeo",
    },
    {
      key: "stage-rooms",
      title: "Stage every room",
      detail:
        "One pass to square up each room: chairs in, cushions up, surfaces styled.",
      after: "wipe-blitz",
    },
    {
      key: "lights-check",
      title: "Lights and final check",
      detail:
        "Final walkthrough of the whole house. Set the lighting. Enjoy the view.",
    },
  ],
};

const ROOM_TASKS: Record<RoomKey, RoomTasks> = {
  kitchen: KITCHEN,
  living: LIVING,
  bedroom: BEDROOM,
  whole: WHOLE,
};

/** Tasks per role for a given mission duration: the room's quick/standard/deep
 * tier maps to 3/4/5 tasks. Unknown durations (e.g. missions created before a
 * preset change) are bucketed against the room's tiers. */
function tasksPerRole(room: RoomKey, durationMinutes: number): number {
  const tiers = ROOM_DURATIONS[room];
  const idx = tiers.indexOf(durationMinutes);
  if (idx >= 0) return 3 + idx;
  if (durationMinutes <= tiers[0]) return 3;
  if (durationMinutes <= tiers[1]) return 4;
  return 5;
}

export interface GeneratedTask {
  taskKey: string;
  role: Role;
  title: string;
  detail: string;
  orderIndex: number;
  dependsOnKey: string | null;
}

export function generateMissionTasks(
  room: RoomKey,
  durationMinutes: number,
  crewRoles: Role[],
): GeneratedTask[] {
  // Players choose their own chores, so any subset of roles can be in play.
  const roles = ROLE_ORDER.filter((r) => crewRoles.includes(r));
  const count = tasksPerRole(room, durationMinutes);
  const templates = ROOM_TASKS[room];

  const picked: GeneratedTask[] = [];
  for (const role of roles) {
    templates[role].slice(0, count).forEach((t, i) => {
      picked.push({
        taskKey: t.key,
        role,
        title: t.title,
        detail: t.detail,
        orderIndex: i,
        dependsOnKey: t.after ?? null,
      });
    });
  }

  // Drop dependencies whose prerequisite didn't make it into this mission
  // (sliced out by duration, or belongs to a role that isn't playing).
  const keys = new Set(picked.map((t) => t.taskKey));
  for (const t of picked) {
    if (t.dependsOnKey && !keys.has(t.dependsOnKey)) t.dependsOnKey = null;
  }

  return picked;
}
