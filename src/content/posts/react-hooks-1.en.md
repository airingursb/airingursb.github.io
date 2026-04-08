---
title: "React Hooks Source Deep Dive (1): Class Components, Function Components, and Pure Components"
date: 2019-09-03
tags: ["tech"]
description: ""
---

> React source version: v16.9.0
> Annotated source notes: [airingursb/react](https://github.com/airingursb/react)

## 1. Class Component vs. Functional Component

According to the [React documentation](https://reactjs.org/docs/components-and-props.html), React components come in two forms: **Functional Components** and **Class Components**.

### 1.1 Class Component

Here's a familiar class component:

```JavaScript
// Class Component
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### 1.2 Functional Component

Functional components are more concise:

```JavaScript
// Functional Component
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

### 1.3 Stateless Component

Functional components used to be called **Stateless Components**, because they couldn't use `state` or lifecycle methods. A functional component simply receives `props`, renders DOM, and minds its own business.

The characteristics of stateless components:

1. Only receive `props` and render DOM
2. No `state`
3. No access to lifecycle methods
4. No class declaration needed: avoids `extends` and `constructor` boilerplate, making the syntax cleaner
5. Not instantiated: can't receive `ref` directly (but can be wrapped with `React.forwardRef`)
6. No need to explicitly bind `this`: unlike ES6 class declarations, functional components don't require binding
7. Better performance: without lifecycle and state management, React skips certain checks and memory allocations, resulting in better performance

Stateless components are simpler, cleaner, and easier to implement quickly. They **work best for small UI pieces** where re-rendering cost is minimal.

## 2. Class Component vs. Pure Component

### 2.1 Class Component

The lifecycle method `shouldComponentUpdate` returns a boolean:

- `true`: re-render when `props` or `state` change
- `false`: don't re-render

In a regular Class Component, this method returns `true` by default — meaning the component and all its children will re-render whenever `props` or `state` change.

### 2.2 Pure Component

Borrowed from the concept of purity in functional programming, a component can be called "pure" if:

1. Its output is determined entirely by its inputs
2. Given the same inputs, it always produces the same output

A React component that renders the same output for the same `state` and `props` can be considered a pure component. React provides `PureComponent` as a base class for this pattern. A class component extending `React.PureComponent` is treated as a pure component.

Pure components reduce unnecessary re-renders and thus improve performance. On each update, React automatically does a shallow comparison of the previous and next `props` and `state` to decide whether to re-render.

Let's look at the source. In the entry file `React.js`, both `Component` and `PureComponent` are exported from `packages/react/src/ReactBaseClasses.js`:

First, the basic `Component`:

```JavaScript
/**
 * Base class helpers for the updating state of a component.
 */
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  // updater varies by platform
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};
Component.prototype.setState = function(partialState, callback) {
  // ...
};

Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;
```

Then `PureComponent`:

```JavaScript
/**
 * Convenience component with default shallow equality check for sCU.
 */
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
Object.assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;
```

`PureComponent` inherits completely from `Component`, with one addition: an `isPureReactComponent` flag on the prototype. What does that flag do?

During update scheduling, this property is used to check whether the component needs to update:

```JavaScript
// packages/react-reconciler/src/ReactFiberClassComponent.js

function checkShouldComponentUpdate(
  workInProgress,
  ctor,
  oldProps,
  newProps,
  oldState,
  newState,
  nextContext,
) {
  const instance = workInProgress.stateNode;
  if (typeof instance.shouldComponentUpdate === 'function') {
    startPhaseTimer(workInProgress, 'shouldComponentUpdate');
    const shouldUpdate = instance.shouldComponentUpdate(
      newProps,
      newState,
      nextContext,
    );
    stopPhaseTimer();

    return shouldUpdate;
  }

  if (ctor.prototype && ctor.prototype.isPureReactComponent) {
    return (
      !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
    );
  }

  return true;
}
```

If it's a PureComponent, new and old `props` and `state` are compared using `shallowEqual()`.

Let's see what `shallowEqual()` does:

```JavaScript
import is from './objectIs';

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
function shallowEqual(objA: mixed, objB: mixed): boolean {
  // Use is() to compare the two arguments — returns true for primitives with the same value,
  // or for two references to the same object
  if (is(objA, objB)) {
    return true;
  }

  // If either argument isn't an object (or is null), return false
  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  // If both are objects, compare their keys and values
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export default shallowEqual;
```

```JavaScript
// Equivalent to Object.is, correcting two edge cases of ===:
// 1. +0 === -0  // true
// 2. NaN === NaN // false
function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
```

From the analysis above, when comparing objects with the same number of keys, shallow comparison only uses `Object.is()` for a primitive comparison of each value. If a key's value is itself an object, the comparison may produce unexpected results. **Shallow equality is not suitable for deeply nested structures.**

Pure components are a meaningful performance optimization in React. They reduce the number of renders: if a pure component's inputs haven't changed, it simply won't re-render. The larger the component tree, the greater the performance gains from pure components.

### 2.3 Pure Functional Component

We've seen that stateless function components are great for simplicity, and pure components are great for performance. Can we get both? At first glance it seems impossible — `PureComponent` is a class component, fundamentally different from function components.

But in React 16.6, `React.memo()` was introduced to **give function components the same render-control capabilities**. `React.memo()` is a higher-order component that wraps a function component, returning a memoized version that only re-renders when props change.

```JavaScript
import React, { memo } from 'react';

const ToTheMoonComponent = React.memo(function MyComponent(props) {
    // only renders if props have changed
});
```

"Memo" is short for memoization — an optimization technique that caches the results of expensive function calls and returns the cached result when the same inputs are seen again. That's exactly what `React.memo()` does: it compares the upcoming render to the previous one, and if they're identical, it skips the re-render.

In earlier versions, this function was called `pure` and came from the `recompose` package, not React itself.

> Memoized component. There was a lot of feedback on the RFC which we agree with — "pure" naming is confusing because memoization (which is what memo does) has nothing to do with function "purity". —— Dan Abramov

### 3. Summary

After covering stateless components, function components, pure components, and class components, let me close with the [KISS (Keep it Simple Stupid)](https://vasanthk.gitbooks.io/react-bits/ux-variations/) principle for choosing React components:

* Use stateless components when a component doesn't need state
* Prefer pure components whenever possible
* Performance: stateless function components > class components > React.createClass()
* Minimize props (the interface): don't pass more props than necessary
* If a component has a lot of conditional logic, it's usually a sign that it should be broken up
* Don't optimize prematurely — just make components reusable for the current requirements, then adapt as needed

This post covered the different types of React components. (There's also the Smart Component / Dumb Component distinction, but that's more about business-level separation and less about technical internals, so I'll skip it here.) The next post will cover how to reuse component logic — and that's where we'll see why we need React Hooks :)
