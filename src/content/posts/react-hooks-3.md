---
title: "React Hooks 源码解析（3）：useState"
date: 2019-11-09
tags: ["tech"]
description: ""
---

> - React 源码版本: v16.11.0
> - 源码注释笔记：[airingursb/react](https://github.com/airingursb/react)

在写本文之前，事先阅读了网上了一些文章，关于 Hooks 的源码解析要么过于浅显、要么就不细致，所以本文着重讲解源码，由浅入深，争取一行代码也不放过。那本系列讲解第一个 Hooks 便是 useState，我们将从 useState 的用法开始，再阐述规则、讲解原理，再简单实现，最后源码解析。另外，在本篇开头，再补充一个 Hooks 的概述，前两篇·限于篇幅问题一直没有写一块。

注：距离上篇文章已经过去了两个月，这两个月业务繁忙所以没有什么时间更新该系列的文章，但 react 这两个月却从 16.9 更新到了 16.11，review 了一下这几次的更新都未涉及到 hooks，所以我也直接把源码笔记这块更新到了 16.11。

## 1. React Hooks 概述

Hook 是 React 16.8 的新增特性，它可以让你在不编写 class 的情况下使用 state 以及其他的 React 特性。其本质上就是一类特殊的函数，它们约定以 `use` 开头，可以为 Function Component 注入一些功能，赋予 Function Component 一些 Class Component 所具备的能力。

例如，原本我们说 Function Component 无法保存状态，所以我们经常说 Stateless Function Component，但是现在我们借助 useState 这个 hook 就可以让 Function Component 像 Class Component 一样具有状态。前段时间 @types/react 也将 SFC 改成了 FC。

### 1.1 动机

在 React 官网的 [Hook 简介](https://zh-hans.reactjs.org/docs/hooks-intro.html)中列举了推出 Hook 的原因：

1. 在组件之间复用状态逻辑很难
2. 复杂组件变得难以理解
3. 难以理解的 class

一，组件之间复用状态逻辑很难。是我们系列第二篇中一直讨论的问题，此处不再赘述。

二，复杂组件变得难以理解，即组件逻辑复杂。主要是针对 Class Component 来说，我们经常要在组件的各种生命周期中编写代码，如在 componentDidMount 和 componentDidUpdate 中获取数据，但是在 componentDidMount 中可能也包括很多其他的逻辑，使得组件越开发越臃肿，且逻辑明显扎堆在各种生命周期函数中，使得 React 开发成为了“面向生命周期编程”。而 Hooks 的出现，将这种这种“面向生命周期编程”变成了“面向业务逻辑编程”，使得开发者不用再去关心本不该关心的生命周期。

三，难以理解的 class，表现为函数式编程比 OOP 更加简单。那么再深入一些去考虑性能，Hook 会因为在渲染时创建函数而变慢吗？答案是不会，在现在浏览器中闭包和类的原始性能只有在极端场景下又有有明显的区别。反而，我们可以认为 Hook 的设计在某些方面会更加高效：

1. Hook 避免了 class 需要的额外开支，像是创建类实例和在构造函数中绑定事件处理器的成本。
2. 符合语言习惯的代码在使用 Hook 时不需要很深的组件树嵌套。这个现象在使用高阶组件、render props、和 context 的代码库中非常普遍。组件树小了，React 的工作量也随之减少。

其实，React Hooks 带来的好处不仅是更函数式、更新粒度更细、代码更清晰，还有以下三个优点：

1. 多个状态不会产生嵌套，写法还是平铺的：如 async/await 之于 callback hell 一样，hooks 也解决了高阶组件的嵌套地狱问题。虽然 renderProps 也可以通过 compose 解决这个问题，但使用略为繁琐，而且因为强制封装一个新对象而增加了实体数量。
2. Hooks 可以引用其他 Hooks，自定义 Hooks 更加灵活。
3. 更容易将组件的 UI 与状态分离。

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

以上 Hooks API 都会在未来一一讲解，此处不再赘述。本文先讲解 useState。

### 1.3 自定义 Hooks

通过自定义 Hook，可以将组件逻辑提取到可重用的函数中。这里安利一个网站：[https://usehooks.com/](https://usehooks.com/)，里面收集了实用的自定义 Hooks，可以无缝接入项目中使用，充分体现了 Hooks 的可复用性之强、使用之简单。

## 2. useState 的用法与规则

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

如果用过 redux 的话，这一幕一定非常眼熟。给定一个初始 state，然后通过 dispatch 一个 action，再经由 reducer 改变 state，再返回新的 state，触发组件重新渲染。

它等价于下面这个 Class Component：

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

可以看到 Function Component 比 Class Component 简洁，useState 的使用也非常简单。但需要注意的是，Hooks 的使用必须要符合这条规则：**确保 Hook 在每一次渲染中都按照同样的顺序被调用**。因此最好每次只在最顶层使用 Hook，不要在循环、条件、嵌套函数中调用 Hooks，否则容易出错。

那么，为什么我们必须要满足这条规则？接下来，我们看一下 useState 的实现原理并自己亲自动手实现一个 useState 便可一目了然。


## 3. useState 的原理与简单实现


### 3.1 Demo 1: dispatch

第二节中我们发现 useState 的用法蛮像 Redux 的，那我们基于 Redux 的思想，自己动手实现一个 useState：

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

我们将从 React 中引入的 useState 替换成自己实现的：

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

这个时候我们发现点击按钮不会有任何响应，count 和 age 都没有变化。因为我们实现的 useState 并不具备存储功能，每次重新渲染上一次的 state 就重置了。这里想到可以在外部用个变量来存储。

### 3.2 Demo 2: 记忆 state

基于此，我们优化一下刚才实现的 useState：

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

虽然按钮点击有变化了，但是效果不太对。如果我们删掉 age 和 name 这两个 useState 会发现效果是正常的。这是因为我们只用了单个变量去储存，那自然只能存储一个 useState 的值。那我们想到可以用备忘录，即一个数组，去储存所有的 state，但同时我们需要维护好数组的索引。

### 3.3 Demo 3: 备忘录

基于此，我们再次优化一下刚才实现的 useState：

```JavaScript

let memoizedState: any[] = [] // hooks 的值存放在这个数组里
let cursor = 0 // 当前 memoizedState 的索引

function useState(initialValue: any) {
    memoizedState[cursor] = memoizedState[cursor] || initialValue
    const currentCursor = cursor
    function setState(newState: any) {
        memoizedState[currentCursor] = newState
        cursor = 0
        render(<App />, document.getElementById('root'))
    }
    return [memoizedState[cursor++], setState] // 返回当前 state，并把 cursor 加 1
}

```

我们点击三次按钮之后，打印出 memoizedState 的数据如下：

![](https://airing.ursb.me/image/media/15731802755726/15732165831599.jpg)

打开页面初次渲染，每次 useState 执行时都会将对应的 setState 绑定到对应索引的位置，然后将初始 state 存入 memoizedState 中。

![useState-1](https://airing.ursb.me/image/media/15731802755726/useState-1.jpg)

在点击按钮的时候，会触发 setCount 和 setAge，每个 setState 都有其对应索引的引用，因此触发对应的 setState 会改变对应位置的 state 的值。

![useState-3](https://airing.ursb.me/image/media/15731802755726/useState-3.jpg)

这里是模拟实现 useState，所以每次调用 setState 都有一次重新渲染的过程。

重新渲染依旧是依次执行 useState，但是 memoizedState 中已经有了上一次是 state 值，因此初始化的值并不是传入的初始值而是上一次的值。

![useState-2](https://airing.ursb.me/image/media/15731802755726/useState-2.jpg)

因此刚才在第二节中遗留问题的答案就很明显了，为什么 Hooks 需要确保 Hook 在每一次渲染中都按照同样的顺序被调用？因为 memoizedState 是按 Hooks 定义的顺序来放置数据的，如果 Hooks 的顺序变化，memoizedState 并不会感知到。因此最好每次只在最顶层使用 Hook，不要在循环、条件、嵌套函数中调用 Hooks。

最后，我们来看看 React 中是怎样实现 useState 的。

## 4. useState 源码解析

### 4.1 入口

首先在入口文件 packages/react/src/React.js 中我们找到 useState，其源自 packages/react/src/ReactHooks.js。

```javascript
export function useState<S>(initialState: (() => S) | S) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

resolveDispatcher() 返回的是 ReactCurrentDispatcher.current，所以 useState 其实就是 ReactCurrentDispatcher.current.useState。

那么，ReactCurrentDispatcher 是什么？

```javascript
import type {Dispatcher} from 'react-reconciler/src/ReactFiberHooks';

const ReactCurrentDispatcher = {
  current: (null: null | Dispatcher),
}
```

我们最终找到了 packages/react-reconciler/src/ReactFiberHooks.js，在这里有 useState 具体实现。该文件也包含了所有 React Hooks 的核心处理逻辑。

### 4.2 类型定义

#### 4.2.1 Hook

在开始之前，我们先看看 ReactFiberHooks.js 中几个类型的定义。首先是 Hooks：

```Javascript
export type Hook = {
  memoizedState: any, // 指向当前渲染节点 Fiber, 上一次完整更新之后的最终状态值

  baseState: any, // 初始化 initialState， 已经每次 dispatch 之后 newState
  baseUpdate: Update<any, any> | null, // 当前需要更新的 Update ，每次更新完之后，会赋值上一个 update，方便 react 在渲染错误的边缘，数据回溯
  queue: UpdateQueue<any, any> | null, // 缓存的更新队列，存储多次更新行为

  next: Hook | null,  // link 到下一个 hooks，通过 next 串联每一 hooks
};
```

可以看到，Hooks 的数据结构和我们之前自己实现的基本一致，memoizedState 也是一个数组，准确来说 React 的 Hooks 是一个单向链表，Hook.next 指向下一个 Hook。

#### 4.2.2 Update & UpdateQueue

那么 baseUpdate 和 queue 又是什么呢？先看一下 Update 和 UpdateQueue 的类型定义：

```Javascript
type Update<S, A> = {
  expirationTime: ExpirationTime, // 当前更新的过期时间
  suspenseConfig: null | SuspenseConfig,
  action: A,
  eagerReducer: ((S, A) => S) | null,
  eagerState: S | null,
  next: Update<S, A> | null, // link 下一个 Update

  priority?: ReactPriorityLevel, // 优先级
};

type UpdateQueue<S, A> = {
  last: Update<S, A> | null,
  dispatch: (A => mixed) | null,
    lastRenderedReducer: ((S, A) => S) | null,
      lastRenderedState: S | null,
};
```

Update 称作一个更新，在调度一次 React 更新时会用到。UpdateQueue 是 Update 的队列，同时还带有更新时的 dispatch。具体的 React Fiber 和 React 更新调度的流程本篇不会涉及，后续会有单独的文章补充讲解。

#### 4.2.3 HooksDispatcherOnMount & HooksDispatcherOnUpdate

还有两个 Dispatch 的类型定义需要关注一下，一个是首次加载时的 HooksDispatcherOnMount，另一个是更新时的 HooksDispatcherOnUpdate。

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


### 4.3 首次渲染

#### 4.3.1 renderWithHooks
React Fiber 会从 packages/react-reconciler/src/ReactFiberBeginWork.js 中的 beginWork() 开始执行（React Fiber 的具体流程后续单独成文补充讲解），对于 Function Component，其走以下逻辑加载或更新组件：

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

在 updateFunctionComponent 中，对于 Hooks 的处理是：

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

因此，我们发现 React Hooks 的渲染核心入口是 renderWithHooks。其他的渲染流程我们并不关心，本文我们着重来看看 renderWithHooks 及其之后的逻辑。

我们回到 ReactFiberHooks.js 来看看 renderWithHooks 具体做了什么，去除容错代码和 `__DEV__` 的部分，renderWithHooks 代码如下：

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

  // The following should have already been reset
  // currentHook = null;
  // workInProgressHook = null;

  // remainingExpirationTime = NoWork;
  // componentUpdateQueue = null;

  // didScheduleRenderPhaseUpdate = false;
  // renderPhaseUpdates = null;
  // numberOfReRenders = 0;
  // sideEffectTag = 0;

  // TODO Warn if no hooks are used at all during mount, then some are used during update.
  // Currently we will identify the update render as a mount because nextCurrentHook === null.
  // This is tricky because it's valid for certain types of components (e.g. React.lazy)

  // Using nextCurrentHook to differentiate between mount/update only works if at least one stateful hook is used.
  // Non-stateful hooks (e.g. context) don't get added to memoizedState,
  // so nextCurrentHook would be null during updates and mounts.
  
  ReactCurrentDispatcher.current =
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  

  let children = Component(props, refOrContext);

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false;
      numberOfReRenders += 1;

      // Start over from the beginning of the list
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

  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrancy.
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  const renderedWork: Fiber = (currentlyRenderingFiber: any);

  renderedWork.memoizedState = firstWorkInProgressHook;
  renderedWork.expirationTime = remainingExpirationTime;
  renderedWork.updateQueue = (componentUpdateQueue: any);
  renderedWork.effectTag |= sideEffectTag;

  // This check uses currentHook so that it works the same in DEV and prod bundles.
  // hookTypesDev could catch more cases (e.g. context) but only in DEV bundles.
  const didRenderTooFewHooks =
    currentHook !== null && currentHook.next !== null;

  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;

  currentHook = null;
  nextCurrentHook = null;
  firstWorkInProgressHook = null;
  workInProgressHook = null;
  nextWorkInProgressHook = null;

  remainingExpirationTime = NoWork;
  componentUpdateQueue = null;
  sideEffectTag = 0;

  // These were reset above
  // didScheduleRenderPhaseUpdate = false;
  // renderPhaseUpdates = null;
  // numberOfReRenders = 0;

  return children;
}

```

renderWithHooks 包括三个部分，首先是赋值 4.1 中提到的 ReactCurrentDispatcher.current，后续是做 didScheduleRenderPhaseUpdate 以及一些初始化的工作。核心是第一部分，我们来看看：

```JavaScript
nextCurrentHook = current !== null ? current.memoizedState : null;
  
ReactCurrentDispatcher.current =
    nextCurrentHook === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
```

如果当前 Fiber 为空，就认为是首次加载，ReactCurrentDispatcher.current.useState 将赋值成 HooksDispatcherOnMount.useState，否则赋值 HooksDispatcherOnUpdate.useState。根据 4.2 中的类型定义，即首次加载时，useState = ReactCurrentDispatcher.current.useState = HooksDispatcherOnMount.useState = mountState；更新时 useState = ReactCurrentDispatcher.current.useState = HooksDispatcherOnUpdate.useState = updateState。

#### 4.3.2 mountState

首先看看 mountState 的实现：

```JavaScript
// 第一次调用组件的 useState 时实际调用的方法
function mountState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  // 创建一个新的 Hook，并返回当前 workInProgressHook
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;

  // 新建一个队列
  const queue = (hook.queue = {
    last: null, // 最后一次更新逻辑,  包括 {action，next} 即状态值和下一次 Update
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: (initialState: any),  // 最后一次渲染组件时的状态
  });

  const dispatch: Dispatch<
    BasicStateAction<S>,
    > = (queue.dispatch = (dispatchAction.bind(
      null,
      // 绑定当前 fiber 和 queue.
      ((currentlyRenderingFiber: any): Fiber),
      queue,
    ): any));
  return [hook.memoizedState, dispatch];
}
```

#### 4.3.3 mountWorkInProgressHook

mountWorkInProgressHook 是创建一个新的 Hook 并返回当前 workInProgressHook，实现如下：

```JavaScript
// 创建一个新的 hook，并返回当前 workInProgressHook
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,

    baseState: null,
    queue: null,
    baseUpdate: null,

    next: null,
  };

  // 只有在第一次打开页面的时候，workInProgressHook 为空
  if (workInProgressHook === null) {
    firstWorkInProgressHook = workInProgressHook = hook;
  } else {
    // 已经存在 workInProgressHook 就将新创建的这个 Hook 接在 workInProgressHook 的尾部。
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```


#### 4.3.4 dispatchAction

我们注意到 mountState 还做了一件很关键的事情，绑定当前 fiber 和 queue 到 dispatchAction 上:

```JavaScript
const dispatch: Dispatch<
    BasicStateAction<S>,
    > = (queue.dispatch = (dispatchAction.bind(
      null,
      // 绑定当前 fiber 和 queue
      ((currentlyRenderingFiber: any): Fiber),
      queue,
    ): any));
```

那我们看一下 dispatchAction 是如何实现的：


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
    // 此分支为 re-render 时的 Fiber 调度处理
    didScheduleRenderPhaseUpdate = true;
    const update: Update<S, A> = {
      expirationTime: renderExpirationTime,
      suspenseConfig: null,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    };
    // 将本次更新周期里的更新记录缓存进 renderPhaseUpdates 中
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

    // 存储所有的更新行为，以便在 re-render 流程中计算最新的状态值
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
      // ... 更新循环链表
      const first = last.next;
      if (first !== null) {
        // Still circular.
        update.next = first;
      }
      last.next = update;
    }
    queue.last = update;

    // 省略特殊情况 Fiber NoWork 时的代码

    // 创建一个更新任务，执行 fiber 的渲染
    scheduleWork(fiber, expirationTime);
  }
}
```

if 的第一个分支涉及 Fiber 的调度，我们此处仅是提及，本文不详细讲解 Fiber，只要知道 `fiber === currentlyRenderingFiber` 时是 re-render，即当前更新周期中又产生了新的周期即可。如果是 re-render，didScheduleRenderPhaseUpdate 置为 true，而在 renderWithHooks 中 如果 didScheduleRenderPhaseUpdate 为 true，就会循环计数 numberOfReRenders 来记录 re-render 的次数；另外 nextWorkInProgressHook 也会有值。所以后续的代码中，有用 numberOfReRenders > 0 来判断是否是 re-render 的，也有用 nextWorkInProgressHook 是否为空来判断是否是 re-render 的。

同时，如果是 re-render，会把所有更新过程中产生的更新记录在 renderPhaseUpdates 这个 Map 上，以每个 Hook 的 queue 为 key。

至于最后 scheduleWork 的具体工作，我们后续单独成文来分析。

### 4.4 更新

#### 4.4.1 updateState

我们看看更新过程中的 useState 时实际调用的方法 updateState：
 
```JavaScript
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === 'function' ? action(state) : action;
}

// 第一次之后每一次执行 useState 时实际调用的方法
function updateState<S>(
  initialState: (() => S) | S,
): [S, Dispatch<BasicStateAction<S>>] {
  return updateReducer(basicStateReducer, (initialState: any));
}
```

可以发现，其实 updateState 最终调用的其实是 updateReducer。对于 useState 触发的 update action 来说，basicStateReducer 就是直接返回 action 的值（如果 action 是函数还会帮忙调用一下）。因此，useState 只是 useReduer 的一个特殊情况而已，其传入的 reducer 为 
basicStateReducer，负责改变 state，而非 useReducer 那样可以传入自定义的 reducer。


#### 4.4.2 updateReducer

那我们来看看 updateReducer 做了些什么：

```JavaScript
function updateReducer<S, I, A>(
  reducer: (S, A) => S,
  initialArg: I,
  init?: I => S,
): [S, Dispatch<A>] {
  // 获取当前正在工作中的 hook
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  queue.lastRenderedReducer = reducer;

  if (numberOfReRenders > 0) {
    // re-render：当前更新周期中产生了新的更新
    const dispatch: Dispatch<A> = (queue.dispatch: any);
    if (renderPhaseUpdates !== null) {
      // 所有更新过程中产生的更新记录在 renderPhaseUpdates 这个 Map上，以每个 Hook 的 queue 为 key。
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
      if (firstRenderPhaseUpdate !== undefined) {
        renderPhaseUpdates.delete(queue);
        let newState = hook.memoizedState;
        let update = firstRenderPhaseUpdate;
        do {
          // 如果是 re-render，继续执行这些更新直到当前渲染周期中没有更新为止
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

        // 循环链表，执行每一次更新
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


updateReducer 分为两种情况：

1. 非 re-render，即当前更新周期只有一个 Update。
2. re-render，当前更新周期又产生了新的更新。

在 4.3.4 中我们提到 numberOfReRenders 记录了 re-render 的次数，如果大于 0 说明当前更新周期中又产生了新的更新，那么就继续执行这些更新，根据 reducer 和 update.action 来创建新的 state，直到当前渲染周期中没有更新为止，最后赋值给 Hook.memoizedState 以及 Hook.baseState。

> 注：其实单独使用 useState 的话几乎不会遇到 re-render 的场景，除非直接把 setState 写在函数的顶部，但是这样会导致无限 re-render，numberOfReRenders 会突破限制，在 4.3.4 dispatchAction 中让程序报错（4.3.4 隐去了 `__DEV__` 与这部分容错代码）：

```JavaScript
invariant(
    numberOfReRenders < RE_RENDER_LIMIT,
    'Too many re-renders. React limits the number of renders to prevent ' +
    'an infinite loop.',
  );
```

那么再来看一下非 re-render 的情况，除去 Fiber 相关的代码和特殊逻辑，重点在于 do-while 循环，这段代码负责循环链表，执行每一次更新：

``` JavaScript
do {
  // 循环链表，执行每一次更新
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

还有一点需要注意，在这种情况下需要对每一个 update 判断优先级，如果不是当前整体更新优先级内的更新会被跳过，第一个跳过的 update 会变成新的 Hook.baseUpdate。需要保证后续的更新要在 baseUpdate 更新之后的基础上再次执行，结果可能会不一样。这里的具体逻辑后续会成文单独解析。最后同样需要赋值给 Hook.memoizedState 以及 Hook.baseState。


#### 4.4.3 updateWorkInProgressHook

这里补充一下，注意到第一行代码获取 Hook 的方式就与 mountState 不同，updateWorkInProgressHook 是获取当前正在工作中的 Hook。实现如下：

```JavaScript
// 获取当前正在工作中的 Hook，即 workInProgressHook
function updateWorkInProgressHook(): Hook {
  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
    nextCurrentHook = currentHook !== null ? currentHook.next : null;
  } else {
    // Clone from the current hook.
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

这里分为两种情况，在 4.3.4 中我们提到如果 nextWorkInProgressHook 存在那么就是 re-render，如果是 re-render 说明当前更新周期中还要继续处理 workInProgressHook。

如果不是 re-render，就取下一个 Hook 为当前的 Hook，同时像 4.3.3  mountWorkInProgressHook 一样，新建一个 Hook 并返回 workInProgressHook。

总之，updateWorkInProgressHook 获取到了当前工作中的 workInProgressHook。


## 5 结语

直观一点，我截了一个 Hook 在运行中的数据结构，如下图所示：

![2DFB1D17-C16F-41B1-B4E3-2BB77A336AF2](https://airing.ursb.me/image/media/15731802755726/2DFB1D17-C16F-41B1-B4E3-2BB77A336AF2.png)


总结一下上文中解析的流程，如下图所示：

![useState 流程](https://airing.ursb.me/image/media/15731802755726/useState%20%E6%B5%81%E7%A8%8B.jpg)

如果对于 useState 的源码仍有所疑惑，可以自己写个小 Demo 在关键函数打断点调试一下。

