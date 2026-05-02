import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Visitors from "@/pages/Visitors";
import Bulletin from "@/pages/Bulletin";
import Giving from "@/pages/Giving";
import Members from "@/pages/Members";
import Sermons from "@/pages/Sermons";
import Inbox from "@/pages/Inbox";
import Agent from "@/pages/Agent";
import Announcements from "@/pages/Announcements";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5_000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={Dashboard} />
      <Route path="/app/visitors" component={Visitors} />
      <Route path="/app/bulletin" component={Bulletin} />
      <Route path="/app/giving" component={Giving} />
      <Route path="/app/members" component={Members} />
      <Route path="/app/sermons" component={Sermons} />
      <Route path="/app/inbox" component={Inbox} />
      <Route path="/app/agent" component={Agent} />
      <Route path="/app/announcements" component={Announcements} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
