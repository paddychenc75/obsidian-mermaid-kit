export interface Template {
  id: string;
  /** Display name per Obsidian language code; `en` is the fallback. */
  name: { en: string; zh: string; "zh-TW": string };
  /** Extra words the picker's filter should match. */
  keywords: string;
  body: string;
}

/**
 * One short, valid starter per diagram type. The picker renders each with the Mermaid build
 * Obsidian ships and drops the ones that build cannot draw, so newer types can be listed here
 * before every supported app version knows them.
 */
export const TEMPLATES: Template[] = [
  {
    id: "flowchart",
    name: { en: "Flowchart", zh: "流程图", "zh-TW": "流程圖" },
    keywords: "graph flow process decision",
    body: `flowchart TD
  A([Start]) --> B{Condition?}
  B -- Yes --> C[Do this]
  B -- No --> D[Do that]
  C --> E([End])
  D --> E`,
  },
  {
    id: "sequence",
    name: { en: "Sequence diagram", zh: "时序图", "zh-TW": "循序圖" },
    keywords: "sequenceDiagram message actor participant",
    body: `sequenceDiagram
  autonumber
  participant U as User
  participant A as App
  participant S as Server
  U->>A: Click
  A->>+S: Request
  S-->>-A: Response
  A-->>U: Update view`,
  },
  {
    id: "class",
    name: { en: "Class diagram", zh: "类图", "zh-TW": "類別圖" },
    keywords: "classDiagram uml inheritance",
    body: `classDiagram
  class Animal {
    +String name
    +eat() void
  }
  class Dog {
    +bark() void
  }
  class Owner {
    +String name
  }
  Animal <|-- Dog
  Owner "1" --> "*" Animal : owns`,
  },
  {
    id: "state",
    name: { en: "State diagram", zh: "状态图", "zh-TW": "狀態圖" },
    keywords: "stateDiagram machine transition",
    body: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading : fetch
  Loading --> Ready : success
  Loading --> Failed : error
  Failed --> Loading : retry
  Ready --> [*]`,
  },
  {
    id: "er",
    name: { en: "Entity relationship", zh: "ER 图", "zh-TW": "ER 圖" },
    keywords: "erDiagram entity database table schema",
    body: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    int id PK
    string name
  }
  ORDER {
    int id PK
    int customer_id FK
    date created
  }
  LINE_ITEM {
    int order_id FK
    string product
    int quantity
  }`,
  },
  {
    id: "gantt",
    name: { en: "Gantt chart", zh: "甘特图", "zh-TW": "甘特圖" },
    keywords: "schedule project plan timeline",
    body: `gantt
  title Project plan
  dateFormat YYYY-MM-DD
  section Design
    Research   :done, a1, 2025-01-06, 5d
    Prototype  :active, a2, after a1, 7d
  section Build
    Implement  :b1, after a2, 10d
    Test       :b2, after b1, 5d
    Launch     :milestone, after b2, 0d`,
  },
  {
    id: "pie",
    name: { en: "Pie chart", zh: "饼图", "zh-TW": "圓餅圖" },
    keywords: "share proportion percent",
    body: `pie showData
  title Time spent
  "Build" : 45
  "Review" : 25
  "Meetings" : 20
  "Other" : 10`,
  },
  {
    id: "mindmap",
    name: { en: "Mindmap", zh: "思维导图", "zh-TW": "心智圖" },
    keywords: "tree outline brainstorm",
    body: `mindmap
  root((Topic))
    Idea A
      Detail 1
      Detail 2
    Idea B
      Detail 3
    Idea C`,
  },
  {
    id: "timeline",
    name: { en: "Timeline", zh: "时间线", "zh-TW": "時間軸" },
    keywords: "history chronology roadmap",
    body: `timeline
  title Roadmap
  section 2024
    Q3 : Research
    Q4 : Prototype
  section 2025
    Q1 : Beta : Feedback
    Q2 : Release`,
  },
  {
    id: "gitgraph",
    name: { en: "Git graph", zh: "Git 分支图", "zh-TW": "Git 分支圖" },
    keywords: "gitGraph branch commit merge",
    body: `gitGraph
  commit
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit`,
  },
  {
    id: "journey",
    name: { en: "User journey", zh: "用户旅程图", "zh-TW": "使用者旅程圖" },
    keywords: "experience steps satisfaction",
    body: `journey
  title A working day
  section Morning
    Plan the day: 5: Me
    Stand-up: 3: Me, Team
  section Afternoon
    Deep work: 4: Me
    Review: 3: Me, Team`,
  },
  {
    id: "quadrant",
    name: { en: "Quadrant chart", zh: "象限图", "zh-TW": "象限圖" },
    keywords: "quadrantChart matrix priority effort impact",
    body: `quadrantChart
  title Effort and impact
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Plan
  quadrant-2 Do first
  quadrant-3 Fill in
  quadrant-4 Reconsider
  Task A: [0.25, 0.8]
  Task B: [0.7, 0.75]
  Task C: [0.3, 0.3]
  Task D: [0.8, 0.2]`,
  },
  {
    id: "xychart",
    name: { en: "XY chart", zh: "XY 图表", "zh-TW": "XY 圖表" },
    keywords: "xychart-beta bar line graph plot",
    body: `xychart-beta
  title "Monthly revenue"
  x-axis [Jan, Feb, Mar, Apr, May, Jun]
  y-axis "Revenue" 0 --> 100
  bar [30, 45, 52, 61, 75, 88]
  line [30, 45, 52, 61, 75, 88]`,
  },
  {
    id: "sankey",
    name: { en: "Sankey diagram", zh: "桑基图", "zh-TW": "桑基圖" },
    keywords: "sankey-beta flow energy budget",
    body: `sankey-beta

Income,Rent,40
Income,Food,20
Income,Savings,25
Income,Other,15
Savings,Fund,15
Savings,Cash,10`,
  },
  {
    id: "block",
    name: { en: "Block diagram", zh: "块图", "zh-TW": "區塊圖" },
    keywords: "block-beta layout grid",
    body: `block-beta
  columns 3
  Client:3
  API Worker Cache
  Database[("Database")]:3
  Client --> API
  API --> Database`,
  },
  {
    id: "architecture",
    name: { en: "Architecture diagram", zh: "架构图", "zh-TW": "架構圖" },
    keywords: "architecture-beta cloud service infrastructure",
    body: `architecture-beta
  group api(cloud)[API]

  service gateway(internet)[Gateway] in api
  service server(server)[Server] in api
  service db(database)[Database] in api
  service store(disk)[Storage] in api

  gateway:R --> L:server
  server:R --> L:db
  server:B --> T:store`,
  },
  {
    id: "kanban",
    name: { en: "Kanban board", zh: "看板", "zh-TW": "看板" },
    keywords: "board task todo",
    body: `kanban
  todo[To do]
    t1[Write the spec]
    t2[Design the API]
  doing[In progress]
    t3[Build the prototype]
  done[Done]
    t4[Kick-off]`,
  },
  {
    id: "requirement",
    name: { en: "Requirement diagram", zh: "需求图", "zh-TW": "需求圖" },
    keywords: "requirementDiagram sysml",
    body: `requirementDiagram
  requirement login {
    id: 1
    text: Users can sign in
    risk: medium
    verifymethod: test
  }
  element auth_service {
    type: service
  }
  auth_service - satisfies -> login`,
  },
  {
    id: "c4",
    name: { en: "C4 context", zh: "C4 上下文图", "zh-TW": "C4 情境圖" },
    keywords: "C4Context system architecture",
    body: `C4Context
  title System context
  Person(user, "User", "Uses the product")
  System(app, "App", "The system being described")
  System_Ext(mail, "Mail service", "Sends notifications")
  Rel(user, app, "Uses")
  Rel(app, mail, "Sends mail through")`,
  },
  {
    id: "packet",
    name: { en: "Packet diagram", zh: "数据包图", "zh-TW": "封包圖" },
    keywords: "packet-beta network protocol header bits",
    body: `packet-beta
  0-15: "Source port"
  16-31: "Destination port"
  32-63: "Sequence number"
  64-95: "Acknowledgment number"
  96-111: "Flags"
  112-127: "Window"`,
  },
  {
    id: "radar",
    name: { en: "Radar chart", zh: "雷达图", "zh-TW": "雷達圖" },
    keywords: "radar-beta spider skills compare",
    body: `radar-beta
  title Skills
  axis design["Design"], code["Code"], test["Testing"], docs["Docs"], ops["Ops"]
  curve a["Alice"]{4, 5, 3, 2, 3}
  curve b["Bob"]{3, 3, 5, 4, 2}
  max 5`,
  },
  {
    id: "treemap",
    name: { en: "Treemap", zh: "矩形树图", "zh-TW": "矩形樹狀圖" },
    keywords: "treemap-beta hierarchy size",
    body: `treemap-beta
"Product"
  "Frontend": 40
  "Backend": 35
"Platform"
  "Infra": 15
  "Tooling": 10`,
  },
];
