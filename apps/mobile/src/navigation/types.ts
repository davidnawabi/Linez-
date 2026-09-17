export type RootStackParamList = {
  Home: undefined;
  VenueDetail: { venueId: string };
  SubmitReport: { venueId: string };
  FastPass: undefined;
  FastPassPass: { venueId: string; venueName: string };
};
