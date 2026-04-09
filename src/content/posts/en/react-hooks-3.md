---
title: "React Hooks Source Deep Dive (3): useState"
date: 2019-11-09
tags: ["tech"]
description: ""
---

> - React source version: v16.11.0
> - Annotated source notes: [airingursb/react](https://github.com/airingursb/react)

Before writing this post, I read through a number of articles on Hooks source code analysis. Most were either too superficial or not thorough enough. So this post goes deep into the source code, line by line, from the ground up. We'll start with how `useState` is used, then cover the rules, explain the principles, build a simple implementation, and finally walk through the actual React source.

I'm also using the opening of this post to include a Hooks overview — I kept meaning to add it in the first two posts but ran out of space.

Note: It's been two months since my last post — I've been busy with work. React has gone from 16.9 to 16.11 in that time. After reviewing the changelogs, none of the updates touched Hooks, so I've just updated my source annotations to 16.11.

## 1. React Hooks Overview

Hooks are a new feature introduced in React 16.8. They let you use state and other React features without writing a class component. At their core, Hooks are a special category of functions — they all start with `use` by convention — that inject functionality into Function Components, giving them capabilities that were previously only available in Class Components.

For example, we used to say Function Components couldn't hold state, hence "Stateless Function Components." With `useState`, a Function Component can now maintain state just like a Class Component. `@types/react` even renamed `SFC` to `FC` to reflect this.

### 1.1 Motivation

The [Hooks introduction](https://reactjs.org/docs/hooks-intro.html) in the React docs cites three motivations:

1. It's hard to reuse stateful logic between components
2. Complex components become hard to understand
3. Classes are confusing

**First**, reusing stateful logic between components — this was the main topic of the previous post, so I won't repeat it here.

**Second**, complex components becoming hard to understand. This mainly applies to Class Components. We end up writing code scattered across lifecycle methods — fetching data in both `componentDidMount` and `componentDidUpdate`, event bindings alongside unrelated logic, and so on. Components bloat up, and logic gets buried in lifecycle functions. React development becomes "lifecycle-oriented programming." Hooks shift this to "business-logic-oriented programming" — developers can stop thinking about lifecycles they shouldn't have to care about.

**Third**, classes are confusing. Functional programming is simply easier to understand than OOP. Going a step further into performance: do Hooks slow things down by creating functions on every render? No. In modern browsers, the raw performance difference between closures and classes only shows up in extreme scenarios. In fact, Hooks can be more efficient in some ways:

1. Hooks avoid the overhead of class instances and constructor-based event handler binding.
2. Idiomatic code with Hooks doesn't need deep component tree nesting — unlike with HOCs, render props, and context. A smaller tree means less work for React.

The benefits of React Hooks go beyond being more functional, fine-grained, and readable. There are three more advantages:

1. **Flat structure instead of nesting**: Like `async/await` solving callback hell, Hooks solve HOC nesting hell. Render props can also address this via `compose`, but it's more cumbersome and introduces extra entities.
2. **Hooks can reference other Hooks**: Custom Hooks are extremely flexible.
3. **Easier separation of UI and state**: Component logic and rendering become more decoupled.

### 1.2 Hooks API

* useState
* useEffect
* useContext
* useReducer
* useCallback
* useMemo
* useRef
* useImperativeHandle
* useLayoutEffect
* useDebugValue
* useResponder

All of these will be covered in future posts. This one focuses on `useState`.

### 1.3 Custom Hooks

Custom Hooks let you extract component logic into reusable functions. I highly recommend [https://usehooks.com/](https://usehooks.com/) — it's a collection of practical custom Hooks you can drop straight into your projects. It's a great showcase of how reusable and elegant Hooks can be.

## 2. useState Usage and Rules

```javascript
import React, { useState } from 'react'

const App: React.FC = () => {
    const [count, setCount] = useState<number>(0)
    const [name, setName] = useState<string>('airing')
    const [age, setAge] = useState<number>(18)

    return (
        <>
            <p>You clicked {count} times</p>
            <button onClick={() => {
                setCount(count + 1)
                setAge(age + 1)
            }}>
                Click me
            </button>
        </>
    )
}

export default App
```

If you've used Redux before, this will look familiar. You have an initial state, dispatch actions, a reducer processes them, new state is returned, and the component re-renders.

This is equivalent to the following Class Component:

```javascript
import React from 'react'

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
      age: 18,
      name: 'airing'
    };
  }

  render() {
    return (
      <>
        <p>You clicked {this.state.count} times</p>
        <button onClick={() => this.setState({ 
            count: this.state.count + 1,
            age: this.state.age + 1
        })}>
          Click me
        </button>
      </>
    );
  }
}

export default App
```

The Function Component version is much cleaner. `useState` is simple to use, but there's one important rule: **Hooks must be called in the same order on every render**. Always call Hooks at the top level of your component — never inside loops, conditions, or nested functions.

Why this rule? Let's build a simple implementation of `useState` to understand it.

## 3. How useState Works: A Simple Implementation

### 3.1 Demo 1: dispatch

The `useState` usage pattern resembles Redux. Let's implement one from scratch, Redux-style:

```javascript
function useState(initialValue) {
    let state = initialValue
    function dispatch(newState) {
        state = newState
        render(<App />, document.getElementById('root'))
    }
    return [state, dispatch]
}
```

Replacing the React import with our own:

```JavaScript
import React from 'react'
import { render } from 'react-dom'

function useState(initialValue: any) {
    let state = initialValue
    function dispatch(newState: any) {
        state = newState
        render(<App />, document.getElementById('root'))
    }
    return [state, dispatch]
}

const App: React.FC = () => {
    const [count, setCount] = useState(0)
    const [name, setName] = useState('airing')
    const [age, setAge] = useState(18)

    return (
        <>
            <p>You clicked {count} times</p>
            <p>Your age is {age}</p>
            <p>Your name is {name}</p>
            <button onClick={() => {
                setCount(count + 1)
                setAge(age + 1)
            }}>
                Click me
            </button>
        </>
    )
}

export default App
```

Clicking the button does nothing — `count` and `age` don't change. Our `useState` doesn't persist state between renders; each re-render resets it to the initial value. We need to store it somewhere external.

### 3.2 Demo 2: Remembering State

Let's improve it:

```JavaScript
let _state: any
function useState(initialValue: any) {
    _state = _state | initialValue
    function setState(newState: any) {
        _state = newState
        render(<App />, document.getElementById('root'))
    }
    return [_state, setState]
}
```

The button now responds, but only partially. If you remove the `age` and `name` useState calls, it works fine. The problem is we're only using one variable — it can only store state for one Hook. We need a memo of sorts: an array to hold all state values, with carefully maintained indices.

### 3.3 Demo 3: Memoization

Let's improve it again:

```JavaScript
let memoizedState: any[] = [] // stores all Hook values
let cursor = 0 // current index into memoizedState

function useState(initialValue: any) {
    memoizedState[cursor] = memoizedState[cursor] || initialValue
    const currentCursor = cursor
    function setState(newState: any) {
        memoizedState[currentCursor] = newState
        cursor = 0
        render(<App />, document.getElementById('root'))
    }
    return [memoizedState[cursor++], setState] // return current state and advance cursor
}
```

After three button clicks, `memoizedState` looks like this:

![](https://airing.ursb.me/image/media/15731802755726/15732165831599.jpg)

On first render, each `useState` call stores its initial state at the corresponding index and binds `setState` to that index.

![useState-1](https://airing.ursb.me/image/media/15731802755726/useState-1.jpg)

On button click, `setCount` and `setAge` fire. Each `setState` has a reference to its own cursor index, so calling it updates only the right slot.

![useState-3](https://airing.ursb.me/image/media/15731802755726/useState-3.jpg)

This is a simplified implementation, so each `setState` call triggers a full re-render.

On re-render, each `useState` runs again in sequence — but `memoizedState` already contains the previous state values, so the initial value isn't used.

![useState-2](https://airing.ursb.me/image/media/15731802755726/useState-2.jpg)

Now the answer to the rule we left unanswered becomes clear: **why must Hooks be called in the same order on every render?** Because `memoizedState` is indexed by call order. If the order of Hook calls changes, the array has no way of knowing — it'll match the wrong state to the wrong Hook. That's why Hooks must always be called at the top level, not inside loops, conditions, or nested functions.

## 4. useState Source Code

### 4.1 Entry Point

In the entry file `packages/react/src/React.js`, `useState` comes from `packages/react/src/ReactHooks.js`:

```javascript
export function useState<S>(initialState: (() => S) | S) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

`resolveDispatcher()` returns `ReactCurrentDispatcher.current`, so `useState` is really `ReactCurrentDispatcher.current.useState`.

What is `ReactCurrentDispatcher`?

```javascript
import type {Dispatcher} from 'react-reconciler/src/ReactFiberHooks';

const ReactCurrentDispatcher = {
  current: (null: null | Dispatcher),
}
```

The actual `useState` implementation lives in `packages/react-reconciler/src/ReactFiberHooks.js`, which contains all the core logic for React Hooks.

### 4.2 Type Definitions

#### 4.2.1 Hook

First, let's look at the Hook type:

```Javascript
export type Hook = {
  memoizedState: any, // points to the current Fiber's last fully committed state value

  baseState: any, // initial state / state after each dispatch
  baseUpdate: Update<any, any> | null, // the update that needs processing; after update, stores previous update for rollback
  queue: UpdateQueue<any, any> | null, // cached update queue for multiple update actions

  next: Hook | null, // link to the next Hook — Hooks form a singly linked list
};
```

The structure is very similar to our simplified implementation. `memoizedState` is effectively an array — more precisely, React Hooks form a singly linked list, where `Hook.next` points to the next Hook.

#### 4.2.2 Update & UpdateQueue

What are `baseUpdate` and `queue`? Here are their types:

```Javascript
type Update<S, A> = {
  expirationTime: ExpirationTime, // when this update expires
  suspenseConfig: null | SuspenseConfig,
  action: A,
  eagerReducer: ((S, A) => S) | null,
  eagerState: S | null,
  next: Update<S, A> | null, // link to next Update

  priority?: ReactPriorityLevel,
};

type UpdateQueue<S, A> = {
  last: Update<S, A> | null,
  dispatch: (A => mixed) | null,
    lastRenderedReducer: ((S, A) => S) | null,
      lastRenderedState: S | null,
};
```

An `Update` represents a single state update during a React render cycle. `UpdateQueue` is a queue of updates, along with the dispatch function. The details of Fiber scheduling and React's update flow will be covered in a separate post.

#### 4.2.3 HooksDispatcherOnMount & HooksDispatcherOnUpdate

Two dispatcher objects determine which implementation runs:

```JavaScript
const HooksDispatcherOnMount: Dispatcher = {
  readContext,

  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  useDebugValue: mountDebugValue,
  useResponder: createResponderListener,
};

const HooksDispatcherOnUpdate: Dispatcher = {
  readContext,

  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useDebugValue: updateDebugValue,
  useResponder: createResponderListener,
};
```

### 4.3 First Render

#### 4.3.1 renderWithHooks

React Fiber starts processing Function Components in `beginWork()` in `ReactFiberBeginWork.js`. For Function Components, it calls `updateFunctionComponent`, which in turn calls:

```JavaScript
case FunctionComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps =
        workInProgress.elementType === Component
          ? unresolvedProps
          : resolveDefaultProps(Component, unresolvedProps);
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderExpirationTime,
      );
    }
```

Inside `updateFunctionComponent`, Hooks are handled through:

```JavaScript
nextChildren = renderWithHooks(
  current,
  workInProgress,
  Component,
  nextProps,
  context,
  renderExpirationTime,
);
```

So the core entry point for React Hooks rendering is `renderWithHooks`. Here's the implementation (with error handling and `__DEV__` code stripped):

```JavaScript
export function renderWithHooks(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  props: any,
  refOrContext: any,
  nextRenderExpirationTime: ExpirationTime,
): any {
  renderExpirationTime = nextRenderExpirationTime;
  currentlyRenderingFiber = workInProgress;
  nextCurrentHook = current !== null ? current.memoizedState : null;

  ReactCurrentDispatcher.current =
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  

  let children = Component(props, refOrContext);

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false;
      numberOfReRenders += 1;

      nextCurrentHook = current !== null ? current.memoizedState : null;
      nextWorkInProgressHook = firstWorkInProgressHook;

      currentHook = null;
      workInProgressHook = null;
      componentUpdateQueue = null;

      ReactCurrentDispatcher.current = __DEV__
        ? HooksDispatcherOnUpdateInDEV
        : HooksDispatcherOnUpdate;

      children = Component(props, refOrContext);
    } while (didScheduleRenderPhaseUpdate);

    renderPhaseUpdates = null;
    numberOfReRenders = 0;
  }

  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  const renderedWork: Fiber = (currentlyRenderingFiber: any);

  renderedWork.memoizedState = firstWorkInProgressHook;
  renderedWork.expirationTime = remainingExpirationTime;
  renderedWork.updateQueue = (componentUpdateQueue: any);
  renderedWork.effectTag |= sideEffectTag;

  // ... cleanup

  return children;
}
```

The key part at the start:

```JavaScript
nextCurrentHook = current !== null ? current.memoizedState : null;
  
ReactCurrentDispatcher.current =
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
```

If the current Fiber is null, it's the first render, and `ReactCurrentDispatcher.current.useState` becomes `mountState`. Otherwise it becomes `updateState`.

#### 4.3.2 mountState

Here's `mountState`:

```JavaScript
// Called when useState is used for the first time
function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  // Create a new Hook and return the current workInProgressHook
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;

  // Create a new queue
  const queue = (hook.queue = {
    last: null, // last update: {action, next}
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any), // state at last render
  });

  const dispatch: Dispatch<
    BasicStateAction<S>,
    > = (queue.dispatch = (dispatchAction.bind(
      null,
      // bind current fiber and queue
      ((currentlyRenderingFiber: any): Fiber),
      queue,
    ): any));
  return [hook.memoizedState, dispatch];
}
```

#### 4.3.3 mountWorkInProgressHook

`mountWorkInProgressHook` creates a new Hook and returns the current `workInProgressHook`:

```JavaScript
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    queue: null,
    baseUpdate: null,

    next: null,
  };

  // On first render, workInProgressHook is null
  if (workInProgressHook === null) {
    firstWorkInProgressHook = workInProgressHook = hook;
  } else {
    // Append the new Hook to the end of the linked list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

#### 4.3.4 dispatchAction

`mountState` does one more critical thing: it binds the current Fiber and queue to `dispatchAction`:

```JavaScript
const dispatch: Dispatch<
    BasicStateAction<S>,
    > = (queue.dispatch = (dispatchAction.bind(
      null,
      // bind current fiber and queue
      ((currentlyRenderingFiber: any): Fiber),
      queue,
    ): any));
```

Here's `dispatchAction`:

```JavaScript
function dispatchAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
) {
  const alternate = fiber.alternate;
  if (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  ) {
    // Re-render: a new update occurred during the current render cycle
    didScheduleRenderPhaseUpdate = true;
    const update: Update<S, A> = {
      expirationTime: renderExpirationTime,
      suspenseConfig: null,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    };
    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map();
    }
    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update);
    } else {
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate;
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      }
      lastRenderPhaseUpdate.next = update;
    }
  } else {
    const currentTime = requestCurrentTime();
    const suspenseConfig = requestCurrentSuspenseConfig();
    const expirationTime = computeExpirationForFiber(
      currentTime,
      fiber,
      suspenseConfig,
    );

    // Store the update for computing the latest state during re-render
    const update: Update<S, A> = {
      expirationTime,
      suspenseConfig,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    };

    // Append the update to the end of the list.
    const last = queue.last;
    if (last === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      const first = last.next;
      if (first !== null) {
        update.next = first;
      }
      last.next = update;
    }
    queue.last = update;

    // Schedule a render update
    scheduleWork(fiber, expirationTime);
  }
}
```

The first branch handles re-render scheduling via Fiber — we'll skip the details here. Just know that when `fiber === currentlyRenderingFiber`, it's a re-render. During a re-render, `didScheduleRenderPhaseUpdate` is set to `true`, and `renderWithHooks` will loop and increment `numberOfReRenders`. All updates during re-render are stored in `renderPhaseUpdates` keyed by the Hook's queue.

The final `scheduleWork` call will be analyzed in a separate post.

### 4.4 Updates

#### 4.4.1 updateState

On subsequent renders, `useState` calls `updateState`:

```JavaScript
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === 'function' ? action(state) : action;
}

function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, (initialState: any));
}
```

`updateState` just calls `updateReducer`. The `basicStateReducer` simply returns the action value (calling it first if it's a function). This means `useState` is really just a special case of `useReducer` with a built-in identity reducer.

#### 4.4.2 updateReducer

```JavaScript
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  queue.lastRenderedReducer = reducer;

  if (numberOfReRenders > 0) {
    // Re-render case
    const dispatch: Dispatch<A> = (queue.dispatch: any);
    if (renderPhaseUpdates !== null) {
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
      if (firstRenderPhaseUpdate !== undefined) {
        renderPhaseUpdates.delete(queue);
        let newState = hook.memoizedState;
        let update = firstRenderPhaseUpdate;
        do {
          const action = update.action;
          newState = reducer(newState, action);
          update = update.next;
        } while (update !== null);
        
        if (!is(newState, hook.memoizedState)) {
          markWorkInProgressReceivedUpdate();
        }

        hook.memoizedState = newState;
        if (hook.baseUpdate === queue.last) {
          hook.baseState = newState;
        }

        queue.lastRenderedState = newState;

        return [newState, dispatch];
      }
    }
    return [hook.memoizedState, dispatch];
  }

  const last = queue.last;
  const baseUpdate = hook.baseUpdate;
  const baseState = hook.baseState;
  
  let first;
  if (baseUpdate !== null) {
    if (last !== null) {
      last.next = null;
    }
    first = baseUpdate.next;
  } else {
    first = last !== null ? last.next : null;
  }
  if (first !== null) {
    let newState = baseState;
    let newBaseState = null;
    let newBaseUpdate = null;
    let prevUpdate = baseUpdate;
    let update = first;
    let didSkip = false;
    do {
      const updateExpirationTime = update.expirationTime;
      if (updateExpirationTime < renderExpirationTime) {
        if (!didSkip) {
          didSkip = true;
          newBaseUpdate = prevUpdate;
          newBaseState = newState;
        }
        if (updateExpirationTime > remainingExpirationTime) {
          remainingExpirationTime = updateExpirationTime;
        }
      } else {
        markRenderEventTimeAndConfig(
          updateExpirationTime,
          update.suspenseConfig,
        );

        // Loop through the circular list and apply each update
        if (update.eagerReducer === reducer) {
          newState = ((update.eagerState: any): S);
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }
      prevUpdate = update;
      update = update.next;
    } while (update !== null && update !== first);

    if (!didSkip) {
      newBaseUpdate = prevUpdate;
      newBaseState = newState;
    }

    if (!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    hook.baseUpdate = newBaseUpdate;
    hook.baseState = newBaseState;

    queue.lastRenderedState = newState;
  }

  const dispatch: Dispatch<A> = (queue.dispatch: any);
  return [hook.memoizedState, dispatch];
}
```

`updateReducer` handles two cases:

1. **Normal update**: a single update in the current render cycle.
2. **Re-render**: a new update occurred during the current render cycle.

If `numberOfReRenders > 0`, it's a re-render. The code keeps processing updates from `renderPhaseUpdates` until the cycle is clean, then assigns the result to `Hook.memoizedState` and `Hook.baseState`.

> Note: In practice, you'd rarely hit a re-render with plain `useState` — unless you call `setState` at the top level of a component, which would cause an infinite loop. React catches this: `Too many re-renders. React limits the number of renders to prevent an infinite loop.`

In the normal case, the do-while loop processes each update in the circular linked list:

```JavaScript
do {
  if (update.eagerReducer === reducer) {
    newState = ((update.eagerState: any): S);
  } else {
    const action = update.action;
    newState = reducer(newState, action);
  }
  prevUpdate = update;
  update = update.next;
} while (update !== null && update !== first);
```

Updates with lower priority than the current render are skipped, and the first skipped update becomes the new `Hook.baseUpdate`. Subsequent updates will be re-applied on top of `baseUpdate` in a later render. This detail will be covered separately.

#### 4.4.3 updateWorkInProgressHook

Note that updates retrieve the Hook differently from mounts:

```JavaScript
function updateWorkInProgressHook(): Hook {
  if (nextWorkInProgressHook !== null) {
    // Re-render: reuse the existing work-in-progress hook
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
    nextCurrentHook = currentHook !== null ? currentHook.next : null;
  } else {
    // Normal update: clone from current hook
    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,

      baseState: currentHook.baseState,
      queue: currentHook.queue,
      baseUpdate: currentHook.baseUpdate,

      next: null,
    };

    if (workInProgressHook === null) {
      workInProgressHook = firstWorkInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
    nextCurrentHook = currentHook.next;
  }
  return workInProgressHook;
}
```

Two cases: if `nextWorkInProgressHook` is non-null, it's a re-render and we continue processing. Otherwise, we clone the current Hook and return the new `workInProgressHook`.

## 5. Closing Thoughts

Here's a snapshot of what a Hook's data structure looks like at runtime:

![2DFB1D17-C16F-41B1-B4E3-2BB77A336AF2](https://airing.ursb.me/image/media/15731802755726/2DFB1D17-C16F-41B1-B4E3-2BB77A336AF2.png)

And a flow diagram summarizing everything we've analyzed:

![useState flow](https://airing.ursb.me/image/media/15731802755726/useState%20%E6%B5%81%E7%A8%8B.jpg)

If anything about `useState` is still unclear, try writing a small demo and setting breakpoints at the key functions to step through it yourself.
