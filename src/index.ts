// Servicios
export { authService } from './services/auth.service';
export { tripsService } from './services/trips.service';
export { membersService } from './services/members.service';
export { invitesService } from './services/invites.service';
export { pollsService } from './services/polls.service';
export { proposalsService } from './services/proposals.service';
export { expensesService } from './services/expenses.service';
export { storageService } from './services/storage.service';

// Cliente Supabase
export { supabase } from './lib/supabase/client';

// Sesión
export { useSession, sessionStore } from './stores/session.store';

// Hooks principales
export { useTrip } from './hooks/useTrip';
export { useTripMembers } from './hooks/useTripMembers';
export { useDatePoll } from './hooks/useDatePoll';
export { useExpenses } from './hooks/useExpenses';
export { useBalances } from './hooks/useBalances';

// Algoritmos puros (server-side también)
export * from './lib/algorithms';

// Format helpers
export { formatCents, formatDate, formatDateRange, formatPercentage } from './lib/format';
