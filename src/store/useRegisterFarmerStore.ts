import { create } from 'zustand';

// Transient in-progress state for the "Register as a farmer" wizard
// (farm-details -> farm-location -> bank-details). Not persisted — a
// Zustand store rather than route params, since round-tripping several
// text fields through URL params across three screens (and surviving back
// navigation) is more fragile than just holding them in memory until the
// flow either completes or the user backs out of it entirely.
type RegisterFarmerState = {
  farmName: string;
  bio: string;
  setFarmDetails: (farmName: string, bio: string) => void;
  reset: () => void;
};

export const useRegisterFarmerStore = create<RegisterFarmerState>((set) => ({
  farmName: '',
  bio: '',
  setFarmDetails: (farmName, bio) => set({ farmName, bio }),
  reset: () => set({ farmName: '', bio: '' }),
}));
