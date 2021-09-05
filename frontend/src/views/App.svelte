<script>
  import { Router, Route } from 'svelte-navigator'
  import ShaderPage from './ShaderPage.svelte'
  import HomePage from './HomePage.svelte'
</script>

<Router>
  <Route path="/" component={HomePage} />
  <Route path="*src" let:params>
    <ShaderPage src={params.src} />
  </Route>
</Router>
