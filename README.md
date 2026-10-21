# PlanIt!

> - A trip planning application based on standardized decision making processes.
 
<br>

## Project Vision

### Problem
Going out is fun. Planning trips and hangovers isn't. Many people have seen that lots of trips end up getting cancelled due to organization related issues. Examples of such problems would be availability conflicts and unfair bill splitting that leaves lingering resentment. 

### Solution
An application that helps groups organize (and visualize) itineraries, activities, preferences, availability and shared expenses. With our app, people will be able to register themselves, create plans for future trips, manage those plans by adding/removing people/places amongst other features aiming at improving organization and standardizing the decision making process. 

<br>

## Technology Stack 
We intend on using:

- React/Typescript for frontend
- NextJS/Typescritpt for backend
- Supabase and Postgres for database implementation 
- Vercel and github actions for CI/CD 

<br>

## Definition of Done

A Task/Feature is considered complete when all off the following conditions are satisfied: 

- The feature compiles with no warnings/errors
- The feature corresponds to an issue/user story on the project board 
- The feature behaves as specified on the above referred user story
- The feature has tests
- All of the feature's tests are passing 
- The project with the new feature has a line coverage of, at least, 90%.
- The Feature as approved by, at least, one other member of the team
- Every function has a doxygen style comment above it 
- Occasional general comments can be sparsely found enlightening complex implementation details

<br>

## Vertical Prototype

<br>

## MVP : Minimum Viable Product 

<br>

## Project Structure

The project uses Next.js with TypeScript and the App Router.

```text
.
├── app/
│   ├── trips/
│   │   └── new/
│   │       └── page.tsx   # Create a new trip
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   └── supabase.ts        # Supabase client configuration
├── public/
├── .env.local             # Local environment variables (not committed)
├── .gitignore
└── package.json
```

## Environment Variables

The application uses Supabase for database access.

1. Create a `.env.local` file in the project root, at the same level as `package.json`.
2. Add the following environment variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-supabase-publishable-key
```

Replace the example values with the Project URL and Publishable Key from the Supabase dashboard.

**Important:**
- Never commit `.env.local` or expose credentials in the repository.
- The `NEXT_PUBLIC_` prefix makes these variables available to browser-side code. Only use a Supabase publishable key here, never a secret or `service_role` key.

## Running the Application

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a production build:

```bash
npm run build
```


## Authors 

This project is being developed by: 
- Gonçalo Sousa, nºXXXXXXXXX
- Cássia Chagas, nº202600801
- Pedro Monteiro, nºXXXXXXXXX
- Daniel Duarte, nº202306000
