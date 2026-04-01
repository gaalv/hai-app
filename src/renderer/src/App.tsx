import { AppShell } from "./components/layout/AppShell";
import { QuickCapture } from "./windows/QuickCapture";

function App(): JSX.Element {
  // Route quick capture window via hash
  console.log("this is the app");
  if (window.location.hash === "#quick-capture") {
    return <QuickCapture />;
  }
  return <AppShell />;
}

export default App;
