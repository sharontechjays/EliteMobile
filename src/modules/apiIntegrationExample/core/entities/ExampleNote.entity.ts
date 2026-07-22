// Mirrors the shape of a public test API's /posts resource — this module exists purely as a
// reference implementation for wiring a real REST endpoint into this app's clean-architecture
// pattern (entity -> port -> usecase -> adapter -> React Query hook), so it deliberately doesn't
// touch any of the app's real domain modules or mock data.
export interface ExampleNote {
  id: number;
  title: string;
  body: string;
}

export interface NewExampleNote {
  title: string;
  body: string;
}
