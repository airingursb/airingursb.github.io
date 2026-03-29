---
title: "React Hooks 源码解析（1）：类组件、函数组件、纯组件"
date: 2019-09-03
tags: ["tech"]
description: ""
---

> React 源码版本: v16.9.0
> 源码注释笔记：[airingursb/react](https://github.com/airingursb/react)

## 1 Class Component VS. Functional Component

根据 [React 官网](https://reactjs.org/docs/components-and-props.html)，React 中的组件可分为**函数式组件（Functional Component）**与**类组件（Class Component）**。

### 1.1 Class Component

这是一个我们熟悉的类组件：

```JavaScript
// Class Componment
class Welcome extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### 1.2 Functional Component

而函数式组件则更加简洁：

```JavaScript
// Functional Componment
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

### 1.3 Stateless Component

而函数式组件在以往我们也称其为**无状态组件（Stateless Component）**，因为在函数组件中，我们无法使用`state`；甚至它也没法使用组件的生命周期方法。一个函数组件只负责接收`props`，渲染 DOM，而不去关注其他逻辑。

这类组件有以下几个特点：

1. 只负责接收`props`，渲染 DOM
2. 没有 `state`
3. 不能访问生命周期方法
4. 不需要声明类：可以避免 extends 或 constructor 之类的代码，语法上更加简洁。
5. 不会被实例化：因此不能直接传 ref（可以使用 `React.forwardRef` 包装后再传 ref）。
6. 不需要显示声明 this 关键字：在 ES6 的类声明中往往需要将函数的 this 关键字绑定到当前作用域，而因为函数式声明的特性，我们不需要再强制绑定。
7. 更好的性能表现：因为函数式组件中并不需要进行生命周期的管理与状态管理，因此React并不需要进行某些特定的检查或者内存分配，从而保证了更好地性能表现。

无状态组件的代码更加简单清晰且易于快速实现，它们**适用于非常小的 UI 界面**，即这些组件的重新渲染的成本很小。

## 2. Class Component VS. Pure Component

### 2.1 Class Component

生命周期函数 `shouldComponentUpdate` 返回一个布尔值：

- true: 那么当 `props` 或者 `state` 改变的时候进行更新
- false: 不更新

在普通的 Class Component 中该生命周期函数默认返回 true，也就是那么当 `props` 或者 `state` 改变的时候类组件及其子组件会进行更新。

### 2.2 Pure Component

基于函数式编程范例中纯度的概念，如果符合以下两个条件，那么我们可以称一个组件是 Pure Component：

1. 其返回值仅由其输入值决定
2. 对于相同的输入值，返回值始终相同。

如果 React 组件为相同的 state 和 props 呈现相同的输出，则可以将其视为纯组件。对于像这样的类组件，React 提供了 PureComponent 基类。基于`React.PureComponent` 类实现的的类组件被视为纯组件。

Pure Component 可以减少不必要的更新，进而提升性能，每次更新会自动帮你对更新前后的 props 和 state 进行一个简单对比，来决定是否进行更新。

接下来我们看看源码。在入口文件 React.js 中暴露了 Component 和 PureComponent 两个基类，它们来自于 packages/react/src/ReactBaseClasses.js：

首先是基本的 Component：

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
  // 不同平台 updater 不一样
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};
Component.prototype.setState = function(partialState, callback) {
  // 略
};

Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;
```

然后是 PureComponent：

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

可以看到 PureComponent 完全继承自 Component，只是在原型链上加了一个
`isPureReactComponent`，那么这个`isPureReactComponent`有什么用？

在调度更新的时候，这个属性会用来检查组件是否需要更新

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

如果是 PureComponent，那么就会对新旧 `props`和 `state` 用 `shallowEqual()`进行浅比较。

那我们看看 `shallowEqual()` 做了些什么：

```JavaScript
import is from './objectIs';

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
function shallowEqual(objA: mixed, objB: mixed): boolean {
  // 通过 is 函数对两个参数进行比较，判断是否相同，相同直接返回true：基本数据类型值相同，同一个引用对象都表示相同
  if (is(objA, objB)) {
    return true;
  }

  // 如果两个参数不相同，判断两个参数是否至少有一个不是引用类型，是即返回false  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  // 如果两个都是引用类型对象，则继续下面的比较
  // 判断两个不同引用类型对象是否相同
  // 先通过 Object.keys 获取到两个对象的所有属性，具有相同属性，且每个属性值相同即两个对相同（相同也通过is函数完成）
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

// Object.is，排除了===两种不符合预期的情况：
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

由上面的分析可以看到，当对比的类型为 Object 并且 key 的长度相等的时候，浅比较也仅仅是用`Object.is()`对 Object 的 value 做了一个基本数据类型的比较。因此如果 key 里面是对象的话，有可能出现比较不符合预期的情况，所以**浅比较是不适用于嵌套类型的比较的**。

纯组件对 React 的性能优化有重要意义，它减少了组件的渲染操作次数：如果一个组件是一个纯组件，如果输入没有变动，那么这个组件就不需要重新渲染。若组件树越大，纯组件带来的性能优化收益就越高。


### 2.3 Pure Functional Component

在 1.2 和 1.3 中我们说明了无状态的函数组件多么好用，现在 Pure Component 也有性能上减少重复渲染的优点，那它们可以结合使用吗，函数组件能否控制渲染？表面上看不行的，因为 Pure Component 就是一个类组件，它和函数组件的实现上风马牛不相及。

但在 React 16.6 中提供了一个 `memo` 函数，它可以**让我们的函数组件也具备渲染控制的能力**。`React.memo()` 是一个更高阶的组件，接受一个函数组件，返回一个特殊的 HOC（Higher-Order Component），具有记忆功能，能记住输出时渲染的组件。（关于 `React.memo()`的实现以后有机会再写一篇文章单独说一下。）

```JavaScript
import React, { memo } from 'react';

const ToTheMoonComponent = React.memo(function MyComponent(props) {
    // only renders if props have changed
});
```

memo 是 memoization 的简写，备忘录是一种优化技术，主要用于通过存储昂贵的函数调用的结果来加速计算机程序，并在再次发生相同的输入时返回缓存的结果。而这恰恰是 `React.memo()` 所做的实现，它会检查即将到来的渲染是否和前一个相同，如果相同就保留不渲染。

在以前版本中，这个函数的名字叫 `pure`，由 `recompose` 包提供，而不是 React 自带的函数。

> Memoized component. There was a lot of feedback on the RFC which we agree with — "pure" naming is confusing because memoization (which is what memo does) has nothing to do with function "purity". —— Dan Abramov

### 3 小节

介绍了无状态组件、函数组件、纯组件、类组件之后，最后再来介绍一下选用 React 组件的 [Keep it Simple Stupid (KISS)](https://vasanthk.gitbooks.io/react-bits/ux-variations/) 原则：

* 如果组件不需要状态，则使用无状态组件
* 尽可能使用纯组件
* 性能上: 无状态函数组件 > class components > React.createClass()
* 最小化 props(接口)：不要传递超过要求的 props
* 如果组件内部存在较多条件控制流，这通常意味着需要对组件进行抽取。
* 不要过早优化，只要求组件在当前需求下可被复用, 然后随机应变

这一节总结了一些 React 中组件的分类，还有 Smark Component 和 Dumb Component 的分类方法，但是这种主要是业务上的分类和技术原理无关所以就不说了。下一篇文章中将说一下这些组件的复用方法，以此说明我们为什么需要 React Hooks ：）
