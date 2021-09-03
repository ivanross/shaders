<script>
  import { Router, Route } from "svelte-navigator";
  import Content from "./Content.svelte";
  import Home from "./Home.svelte";
</script>

<Router>
  <Route path="/" component={Home} />
  <Route path="*src" let:params>
    <Content src={params.src} />
  </Route>
</Router>
