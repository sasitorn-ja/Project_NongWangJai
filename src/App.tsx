import { AuthGate } from "@/features/auth/AuthGate";
import { getLogoutHref } from "@/features/auth/paths";
import DealerDashboardApp from "@/features/dealers/dashboard";

function App() {
  return (
    <AuthGate>
      {(session) => (
        <DealerDashboardApp
          onLogout={() => {
            window.location.assign(getLogoutHref());
          }}
          user={session}
        />
      )}
    </AuthGate>
  );
}

export default App;
