---
title: "React Hooks Source Deep Dive (4): useEffect"
date: 2019-12-03
tags: ["tech"]
description: ""
---

> - React source version: v16.11.0
> - Annotated source notes: [airingursb/react](https://github.com/airingursb/react)

## 1. Introduction to useEffect

### 1.1 Why useEffect Exists

In the previous posts, we established that React Hooks let Functional Components gain the capabilities of Class Components. The [main motivations](https://me.ursb.me/archives/useState.html#directory026996420065467942) were:

1. It's hard to reuse stateful logic between components
2. Complex components become hard to understand
3. Classes are confusing

Let's dig into the second point. When writing Class Components, we're forced to scatter our logic across lifecycle methods: fetching data in `componentDidMount` and `componentDidUpdate`, binding event listeners alongside unrelated setup code, and so on. Business logic ends up buried in lifecycle hooks. This shifts our thinking to "what do we need to do when the component mounts?" and "what do we need to do when it updates?" — in other words, **lifecycle-oriented programming**. The actual logic we write inside those lifecycle methods becomes a **side effect** of the component's lifecycle.

The second consequence of lifecycle-oriented programming is that related logic gets split apart. For example, an event binding set up in `componentDidMount` needs to be cleaned up in `componentDidUnmount` — so the event management logic is split across two separate methods, making it harder to review and reason about:

```javascript
import React from 'react'
class A extends React.Componment {
  componmentDidMount() {
    document.getElementById('js_button')
      .addEventListener('click', this.log)
  }
  componentDidUnmount() {
    document.getElementById('js_button')
      .removeEventListener('click', this.log)
  }
  
  log = () => {
    console.log('log')
  }
  
  render() {
    return (
      <div id="js_button">button</div>
    )
  }
}
```

`useEffect` brings the developer's attention back to the business logic itself, away from lifecycle concerns. "Effect" is short for "side effect" — `useEffect` is the designated place for the side-effect logic that used to live in lifecycle methods.

### 1.2 useEffect Usage

Here's the same code rewritten with `useEffect`:

```javascript
import React, { useEffect } from 'react'
function A() {
  log() {
    console.log('log')
  }
  useEffect(() => {
    document
      .getElementById('js_button')
      .addEventListener('click', log)
    return () => {
      document
        .getElementById('js_button')
        .removeEventListener('click', log)
    }
  })
  return (<div id="js_button">button</div>)
} 
```

`useEffect` takes two arguments. The first is a function that contains the effect (and optionally returns a cleanup function as a thunk). The second is an optional dependency array. If `dependencies` is omitted, the function runs after every render. If `dependencies` is provided, the function only runs when those values change. By extension, if `dependencies` is an empty array, the function only runs after the initial render.

```javascript
useEffect(
  () => {
    const subscription = props.source.subscribe();
    return () => {
      subscription.unsubscribe();
    };
  },
  [props.source],
);
```

> For more usage details: [useEffect API Reference | React Docs](https://reactjs.org/docs/hooks-reference.html#useeffect)

## 2. useEffect: A Simple Implementation

Based on the usage above, here's a minimal `useEffect` implementation:

```javascript
let _deps;

function useEffect(callback, dependencies) {
  const hasChanged = _deps
    && !dependencies.every((el, i) => el === _deps[i])
    || true;
  // If dependencies is absent, or if dependencies have changed, run the callback
  if (!dependencies || hasChanged) {
    callback();
    _deps = dependencies;
  }
}
```

## 3. useEffect Source Code

### 3.1 mountEffect & updateEffect

`useEffect`'s entry point lives in `ReactFiberHooks.js`, the same file as `useState`. Like `useState`, it runs `mountEffect` on the first render and `updateEffect` on subsequent renders. Let's look at what each does.

For `mountEffect`:

```javascript
function mountEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return mountEffectImpl(
    UpdateEffect | PassiveEffect,
    UnmountPassive | MountPassive,
    create,
    deps,
  );
}
```

For `updateEffect`:

```javascript
function updateEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return updateEffectImpl(
    UpdateEffect | PassiveEffect,
    UnmountPassive | MountPassive,
    create,
    deps,
  );
}
```

Both take a function and an array — the `callback` and `deps` we pass to `useEffect`. And both delegate to `mountEffectImpl` / `updateEffectImpl` with identical first two arguments. Those first two arguments — `UpdateEffect | PassiveEffect` and `UnmountPassive | MountPassive` — come from `ReactSideEffectTags` and `ReactHookEffectTags`:

```javascript
import {
  Update as UpdateEffect,
  Passive as PassiveEffect,
} from 'shared/ReactSideEffectTags';
import {
  NoEffect as NoHookEffect,
  UnmountPassive,
  MountPassive,
} from './ReactHookEffectTags';
```

Looking at the definitions:

```javascript
// ReactSideEffectTags.js
export const NoEffect = /*              */ 0b0000000000000;
export const PerformedWork = /*         */ 0b0000000000001;
export const Placement = /*             */ 0b0000000000010;
export const Update = /*                */ 0b0000000000100;
export const PlacementAndUpdate = /*    */ 0b0000000000110;
export const Deletion = /*              */ 0b0000000001000;
export const ContentReset = /*          */ 0b0000000010000;
export const Callback = /*              */ 0b0000000100000;
export const DidCapture = /*            */ 0b0000001000000;
export const Ref = /*                   */ 0b0000010000000;
export const Snapshot = /*              */ 0b0000100000000;
export const Passive = /*               */ 0b0001000000000;
export const Hydrating = /*             */ 0b0010000000000;
export const HydratingAndUpdate = /*    */ 0b0010000000100;

// ReactHookEffectTags.js
export const NoEffect = /*             */ 0b00000000;
export const UnmountSnapshot = /*      */ 0b00000010;
export const UnmountMutation = /*      */ 0b00000100;
export const MountMutation = /*        */ 0b00001000;
export const UnmountLayout = /*        */ 0b00010000;
export const MountLayout = /*          */ 0b00100000;
export const MountPassive = /*         */ 0b01000000;
export const UnmountPassive = /*       */ 0b10000000;
```

This binary flag design simplifies type comparison and composition — if you've built permission systems, you'll recognize the pattern immediately. `UnmountPassive | MountPassive` = `0b11000000`. A non-zero bit means the effect implements that behavior. We'll see this in action later; for now, just keep it in mind.

### 3.2 mountEffectImpl & updateEffectImpl

#### 3.2.1 mountEffectImpl

```javascript
function mountEffectImpl(fiberEffectTag, hookEffectTag, create, deps): void {
  const hook = mountWorkInProgressHook(); // create a new Hook and return current workInProgressHook
  const nextDeps = deps === undefined ? null : deps;
  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, undefined, nextDeps);
}
```

`mountWorkInProgressHook` was covered in [Part 3, Section 4.3.3](https://me.ursb.me/archives/useState.html#directory0568338329425144719) — it creates a new Hook and returns the current `workInProgressHook`.

`sideEffectTag` is bitwise-OR'd with `fiberEffectTag`, then assigned. In `renderWithHooks`, it gets attached to `renderedWork.effectTag` and reset to 0 after each render:

```javascript
renderedWork.effectTag |= sideEffectTag;
sideEffectTag = 0;
```

`hook.memoizedState` stores the result of `pushEffect` — same idea as storing `newState` in `useState`. The key focus now shifts to what `pushEffect` actually does.

#### 3.3.2 updateEffectImpl

```javascript
function updateEffectImpl(fiberEffectTag, hookEffectTag, create, deps): void {
  const hook = updateWorkInProgressHook(); // get the current work-in-progress Hook
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(NoHookEffect, create, destroy, nextDeps);
        return;
      }
    }
  }

  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, destroy, nextDeps);
}
```

`updateWorkInProgressHook` was covered in [Part 3, Section 4.4.3](https://me.ursb.me/archives/useState.html#directory0600654957385160324).

When `currentHook` is null, `updateEffectImpl` behaves identically to `mountEffectImpl`. When it's non-null, the third argument to `pushEffect` is `destroy` rather than `undefined`. And there's `areHookInputsEqual(nextDeps, prevDeps)` — if the current deps equal the previous deps, it calls `pushEffect(NoHookEffect, ...)`, and my guess is that `NoHookEffect` means "don't actually run this effect." This aligns with our simple implementation.

According to [Part 3, Section 4.4.3](https://me.ursb.me/archives/useState.html#directory0600654957385160324), `currentHook` is the currently-being-processed Hook and is normally non-null. The next thing to understand is what `pushEffect` does, and what the third argument means.

### 3.3 pushEffect

```javascript
function pushEffect(tag, create, destroy, deps) {

  const effect: Effect = {
    tag,
    create, 
    destroy,
    deps, 
    // Circular
    next: (null: any), // reference to the next effect in this function component
  };
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```

```javascript
type Effect = {
  tag: HookEffectTag, // binary number that determines effect behavior
  create: () => (() => void) | void, // callback to run after painting
  destroy: (() => void) | void, // determines whether the effect should be torn down and recreated
  deps: Array<mixed> | null, // determines whether to re-run after re-render
  next: Effect, // reference to the next effect in this function component
};
```

This function creates a new effect object and appends it to a circular linked list via `componentUpdateQueue`. The structure of `componentUpdateQueue` is simple:

```Javascript
export type FunctionComponentUpdateQueue = {
  lastEffect: Effect | null,
};
```

`componentUpdateQueue` is just a global variable that stores Effects.

The two branches:

1. **`componentUpdateQueue` is null**: This is the `mountEffect` case. An empty queue `{lastEffect: null}` is created, then `componentUpdateQueue.lastEffect` is set to point to `effect.next` — effectively storing the first effect.

2. **`componentUpdateQueue` is not null**: This is `updateEffect`.
   - **`lastEffect` is null**: First effect of a new render cycle — same logic as case 1.
   - **`lastEffect` is not null**: A second or subsequent `useEffect` in the same component. The new effect is appended after `lastEffect`.

Finally, the effect is returned.

### 3.4 React Fiber Flow Analysis

We've read through the source, but a few questions remain:

1. What do the binary tag values mean?
2. What happens after `pushEffect`?
3. Where does `componentUpdateQueue` get used?

In `renderWithHooks`, `componentUpdateQueue` is assigned to `renderedWork.updateQueue`, and `sideEffectTag` to `renderedWork.effectTag`:

```javascript
renderedWork.updateQueue = (componentUpdateQueue: any);
renderedWork.effectTag |= sideEffectTag;
```

From [Part 3, Section 4.3.1](https://me.ursb.me/archives/useState.html#directory0568338329425144719), we know `renderWithHooks` runs during `updateFunctionComponent`. To trace those three remaining questions, we need to walk through the full Reconciler flow. Fiber is the most complex part of React 16, which is why I've been putting it off. There's enough material there for several posts. Here I'll sketch out the flow quickly, ignoring unrelated details, focusing only on what happens after `useEffect` is called.

Note: if you're not interested in this section, skip to 3.5.

> Recommended reading on React Fiber:
> 1. [A Cartoon Intro to Fiber - React Conf 2017](https://www.youtube.com/watch?v=ZCuYPiUIONs)
> 2. [React Fiber Introduction | Juejin](https://juejin.im/post/5a2276d5518825619a027f57)
> 3. [The Most Plain-Language React Fiber Walkthrough | Juejin](https://juejin.im/post/5dadc6045188255a270a0f85)

#### 3.4.1 ReactDOM.js

The only entry point for page rendering is `ReactDOM.render`:

```javascript
ReactRoot.prototype.render = ReactSyncRoot.prototype.render = function(
  children: ReactNodeList,
  callback: ?() => mixed,
): Work {
  // ... irrelevant code omitted
  updateContainer(children, root, null, work._onCommit);
  return work;
};
```

The core of `render` is calling `updateContainer`, which comes from `ReactFiberReconciler.js`.

#### 3.4.2 ReactFiberReconciler.js

This is the entry point for `react-reconciler`. `updateContainer` is:

```javascript
export function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): ExpirationTime {
  // ... irrelevant code omitted
  return updateContainerAtExpirationTime(
    element,
    container,
    parentComponent,
    expirationTime,
    suspenseConfig,
    callback,
  );
}
```

Which wraps `updateContainerAtExpirationTime`, which wraps `scheduleRootUpdate`:

```javascript
function scheduleRootUpdate(
  current: Fiber,
  element: ReactNodeList,
  expirationTime: ExpirationTime,
  suspenseConfig: null | SuspenseConfig,
  callback: ?Function,
) {
  // ... irrelevant code omitted
  enqueueUpdate(current, update);
  scheduleWork(current, expirationTime);

  return expirationTime;
}
```

The core here is `scheduleWork` — the entry point for Fiber's task loop, defined in `ReactFiberWorkLoop.js`.

#### 3.4.3 ReactFiberWorkLoop.js — Render Phase

`ReactFiberWorkLoop.js` is 2,900 lines and contains the main task loop logic. Starting from `scheduleWork`:

```javascript
export function scheduleUpdateOnFiber(
  fiber: Fiber,
  expirationTime: ExpirationTime,
) {
  // ... irrelevant code omitted
  const priorityLevel = getCurrentPriorityLevel();

  if (expirationTime === Sync) {
    if (
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      schedulePendingInteractions(root, expirationTime);
      let callback = renderRoot(root, Sync, true);
      while (callback !== null) {
        callback = callback(true);
      }
    } else {
      scheduleCallbackForRoot(root, ImmediatePriority, Sync);
      if (executionContext === NoContext) {
        flushSyncCallbackQueue();
      }
    }
  } else {
    scheduleCallbackForRoot(root, priorityLevel, expirationTime);
  }
}
export const scheduleWork = scheduleUpdateOnFiber;
```

Most branches lead to `renderRoot` — that's the entry point for the "render phase" in Fiber's two-phase model.

![](https://airing.ursb.me/image/blog/useEffect/phases.png)

> Source: A Cartoon Intro to Fiber - React Conf 2017

You can also observe these two phases when debugging:

![](https://airing.ursb.me/image/blog/useEffect/phases2.jpg)

In `renderRoot`, the key parts are:

```javascript
function renderRoot(
  root: FiberRoot,
  expirationTime: ExpirationTime,
  isSync: boolean,
): SchedulerCallback | null {
  if (isSync && root.finishedExpirationTime === expirationTime) {
    return commitRoot.bind(null, root); // enter the commit phase
  }
  // ...
  do {
    try {
      if (isSync) {
        workLoopSync();
      } else {
        workLoop(); // core logic
      }
      break;
    } catch (thrownValue) {
      // ...
  } while (true);
  // ...
}
```

Two key points:

1. `workLoop` is the core — a loop that processes work units.
2. When timed out, it enters the commit phase.

`workLoop`:

```javascript
function workLoop() {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

And `performUnitOfWork`:

```javascript
function performUnitOfWork(unitOfWork: Fiber): Fiber | null {
  const current = unitOfWork.alternate;

  let next;
  if (enableProfilerTimer && (unitOfWork.mode & ProfileMode) !== NoMode) {
    next = beginWork(current, unitOfWork, renderExpirationTime);
  } else {
    next = beginWork(current, unitOfWork, renderExpirationTime);
  }

  ReactCurrentOwner.current = null;
  return next;
}
```

The heart of this is `beginWork` from `ReactFiberBeginWork.js`.

#### 3.4.4 ReactFiberBeginWork.js

This analysis mirrors [Part 3, Section 4.3.1](https://me.ursb.me/archives/useState.html#directory04314192122993054717). At this point, `renderedWork.updateQueue` (our Effect list) and `renderedWork.effectTag` are now attached to the Fiber. We skip ahead to see how Fiber processes them.

#### 3.4.5 ReactFiberWorkLoop.js — Commit Phase

Back in `renderRoot`, when the task times out, it enters the commit phase via `commitRoot`:

```javascript
function commitRoot(root) {
  const renderPriorityLevel = getCurrentPriorityLevel();
  runWithPriority(
    ImmediatePriority,
    commitRootImpl.bind(null, root, renderPriorityLevel),
  );
  return null;
}
```

The real logic is in `commitRootImpl`. Simplified:

```javascript
function commitRootImpl(root, renderPriorityLevel) {
  // ...
  
  let firstEffect;
  if (finishedWork.effectTag > PerformedWork) {
    if (finishedWork.lastEffect !== null) {
      finishedWork.lastEffect.nextEffect = finishedWork;
      firstEffect = finishedWork.firstEffect;
    } else {
      firstEffect = finishedWork;
    }
  } else {
    firstEffect = finishedWork.firstEffect;
  }

  if (firstEffect !== null) {
    do {
      try {
        commitBeforeMutationEffects();
      } catch (error) { /* ... */ }
    } while (nextEffect !== null);

    nextEffect = firstEffect;
    do {
      try {
        commitMutationEffects(root, renderPriorityLevel);
      } catch (error) { /* ... */ }
    } while (nextEffect !== null);

    root.current = finishedWork;

    nextEffect = firstEffect;
    do {
      try {
        commitLayoutEffects(root, expirationTime);
      } catch (error) { /* ... */ }
    } while (nextEffect !== null);

    nextEffect = null;
    requestPaint();
    // ...
  }

  // ...
  
  return null;
}
```

When effects exist, there are three processing loops, each calling a different function:

- `commitBeforeMutationEffects`
- `commitMutationEffects`
- `commitLayoutEffects`

The third one is related to `useLayoutEffect`, so I'll cover all three in the next post. For now, just know that all three ultimately call `commitHookEffectList` in `ReactFiberCommitWork.js` when handling Function Components.

### 3.5 commitHookEffectList

After all that, we finally arrive at the destination — `commitHookEffectList` in `ReactFiberCommitWork.js`:

```Javascript
function commitHookEffectList(
  unmountTag: number,
  mountTag: number,
  finishedWork: Fiber,
) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue: any);
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & unmountTag) !== NoHookEffect) {
        // Unmount
        const destroy = effect.destroy;
        effect.destroy = undefined;
        if (destroy !== undefined) {
          destroy();
        }
      }
      if ((effect.tag & mountTag) !== NoHookEffect) {
        // Mount
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

This is beautifully clear. The Effect list is retrieved from `renderedWork.updateQueue`. On unmount, `effect.destroy` runs (the return value of the `useEffect` callback). On mount, `effect.create` runs (the `useEffect` callback itself). All effects are processed in order.

This also confirms our earlier guess: when `tag` is `NoHookEffect`, nothing happens.

We've now traced `useEffect` through the source code. One question remains: what exactly does `effect.tag` do? We've only seen the `NoHookEffect` case — the other values live inside the three functions we glossed over in 3.4.5. Those will be explained in the next post, where we analyze `useLayoutEffect`.

See you then.

Here's a flow diagram summarizing Section 3.4:

![](https://airing.ursb.me/image/blog/useEffect/useEffect.png)
