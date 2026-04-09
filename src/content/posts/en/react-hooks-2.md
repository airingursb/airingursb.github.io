---
title: "React Hooks Source Deep Dive (2): Component Logic Reuse and Extension"
date: 2019-09-11
tags: ["tech"]
description: ""
---

> React source version: v16.9.0
> Annotated source notes: [airingursb/react](https://github.com/airingursb/react)

How do you reuse and extend stateful logic in React components? There are five approaches:

1. Mixins
2. Class Inheritance
3. Higher-Order Components
4. Render Props
5. React Hooks

Let's walk through each one.

## 1. Mixins

![Mixins](http://airing.ursb.me/image/blog/15675688804829/0AA936A7-1AB6-4B23-BD7A-D26B27C98DF4.png)

Mixins work by copying properties from one object onto another — essentially object merging. They were introduced primarily to solve code reuse problems.

> Side note: `Object.assign` is another common method for merging objects. The key difference is that Mixins copy prototype chain properties too (because they use `for...in`), while `Object.assign` doesn't.

Since React no longer supports Mixins, I won't go into how to use them. If you're curious about the old usage, check out: [React Mixin Usage | segmentfault](https://segmentfault.com/a/1190000003016446).

Mixins can solve code reuse, but they cause more problems than they solve. Specifically:

1. **Tight coupling**: Mixins introduce hidden dependencies. Components can become tangled and interdependent, making maintenance difficult.
2. **Name collisions**: If both `FluxListenerMixin` and `WindowSizeMixin` define `handleChange()`, you can't use both at the same time, and you can't define your own method with that name either.
3. **Snowballing complexity**: As the number of Mixins grows, components start to feel their presence and need extra hack logic to handle them, causing complexity to spiral.

## 2. Class Inheritance

Developers familiar with OOP might immediately think of class inheritance for sharing logic — have component A extend component B to reuse the parent's methods. But anyone who's worked with React knows this isn't how we write React components.

The main issue is code quality. If two components each have complex business logic and one inherits from the other, reading the child component becomes confusing — methods are declared elsewhere and you have to jump to the parent to find them. React wants each component to focus on one thing.

Beyond that, if you override a lifecycle method in the child, the parent's lifecycle gets clobbered — which nobody wants.

Facebook is famously against inheritance in React. Their [Composition vs Inheritance](https://reactjs.org/docs/composition-vs-inheritance.html) docs say: "At Facebook, we use React in thousands of components, and we haven't found any use cases where we would recommend creating component inheritance hierarchies."

Functional programming and component-based programming share a common philosophy: the art of composition. A large function can be built from many small, single-purpose functions. Components work the same way. When building React apps, we constantly break down large components into smaller ones, giving each a narrower, cleaner responsibility. Composition brings reusability, testability, and predictability.

So: **prefer composition over inheritance**. Facebook recommends using HOCs for component logic reuse (see [Higher-Order Components](https://reactjs.org/docs/higher-order-components.html)). Let's take a look.

## 3. HOC (Higher-Order Component)

HOC stands for Higher-Order Component. Despite the impressive name, it's no more magical than a higher-order function.

Recall the definition of a higher-order function:

1. A function can be passed as an argument
2. A function can be returned as a value

A higher-order component is the same idea: a function that takes a component as an argument and returns a new component. Note that a HOC is a function, not a component itself. It's essentially a decorator, so you can also use the ES7 decorator syntax — though for clarity, I'll stick with the explicit function syntax here.

> Further reading: Decorator proposal [proposal-decorators | GitHub](https://github.com/tc39/proposal-decorators)

![](http://airing.ursb.me/image/blog/15675688804829/15682018265752.jpg)

There are two flavors of HOCs:

1. **Inheritance-based HOC**: Reverse Inheritance (II)
2. **Proxy-based HOC**: Props Proxy

Inheritance-based HOCs share the same downsides as class inheritance — they can modify the original component's logic rather than simply reusing it. I'll show a quick example but won't dig deeper:

```JavaScript
// Inheritance-based HOC

import React, { Component } from 'react'

export default const HOC = (WrappedComponent) => class NewComponent extends WrappedComponent {
    
    componentWillMount() {
        console.log('This modifies the original component\'s lifecycle')
    }

    render() {
        const element = super.render()
        const newProps = { ...this.props, style: { color: 'red' }}
        return React.cloneElement(element, newProps, element.props.children)
    }
}
```

It works, but it's invasive. Proxy-based HOCs are simpler and cleaner. Here's an example — click below to play with it:

[![Edit HOC](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/hoc-0c2hi?fontsize=14)

![](http://airing.ursb.me/image/blog/15675688804829/15681160373048.jpg)

Suppose we have two components, `Profile` and `Home`, both wrapped in a `Container` with the same styles and a title. We want both to reuse the Container's layout. Here's the HOC approach:

```JavaScript
// app.js

import React from "react";
import ReactDOM from "react-dom";
import Profile from "./components/Profile";
import Home from "./components/Home";
import "./styles.css";

function App() {
    return (
        <div className="App">
            <Profile name={"Airing"} />
            <Home />
        </div>
    );
}
const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```

```JavaScript
// Container.js

import React, { Component } from "react";
import "../styles.css";

export default title => WrappedComponent =>
    class Container extends Component {
        render() {
            return (
                <div className="container">
                    <header className="header">
                        {title}
                    </header>
                    <div>
                        <WrappedComponent url={"https://me.ursb.me"} {...this.props} />
                    </div>
                </div>
            );
        }
    };
```

```JavaScript
// Profile.js

import React, { Component } from "react";
import WrappedComponent from "./WrappedComponent";

class Profile extends Component {
    render() {
        return (
            <>
                <p>Author: {this.props.name}</p>
                <p>Blog: {this.props.url}</p>
                <p>Component A</p>
            </>
        );
    }
}

export default WrappedComponent("Profile")(Profile);
```

```JavaScript
// Home.js

import React, { Component } from "react";
import WrappedComponent from "./WrappedComponent";

class Home extends Component {
    render() {
        return (
            <>
                <p>Component B</p>
            </>
        );
    }
}

export default WrappedComponent("Home")(Home);
```

You can see that a HOC is essentially a proxy for the original component — in the new component's `render`, the wrapped component is rendered, and all the HOC's concerns get handled while everything else is passed through.

Redux's `connect` function is also a HOC:

```JavaScript
ConnectedComment = connect(mapStateToProps, mapDispatchToProps)(Component);
```

Which is equivalent to:

```JavaScript
// connect is a function that returns a function (a higher-order function)
const enhance = connect(mapStateToProps, mapDispatchToProps);
// The returned function is a HOC that returns a new component connected to Redux store
const ConnectedComment = enhance(Component);
```

![Redux connect](http://airing.ursb.me/image/blog/15675688804829/15681177303582.jpg)

Ant Design's Form also uses HOCs:

```JavaScript
const WrappedNormalLoginForm = Form.create()(NormalLoginForm);
```

HOCs are convenient and widely used, but they have real drawbacks:

1. **Wrapper Hell**: Deeply nested component layers (anyone who's debugged Redux-connected components knows the pain), making debugging very difficult.
2. You need to explicitly declare `displayName` to see component names in the debugger.
3. Poor TypeScript compatibility.
4. `ref` forwarding doesn't work out of the box (note: React 16.3 introduced `React.forwardRef` to address this).
5. **Static properties must be manually copied**: When you apply a HOC, you're no longer working with the original component, so you lose access to its static properties. You have to copy them manually at the end of the HOC.
6. **Unrelated props bleed through**: HOCs can intercept props, and if they're not careful they can overwrite or leak props that shouldn't be visible to intermediate components, hurting readability.

```Javascript
/**
 * When using HOCs, we proxy all props — but a given HOC typically only cares about one or a few.
 * We need to pass through all the other props to the original component.
 */

function visible(WrappedComponent) {
  return class extends Component {
    render() {
      const { visible, ...props } = this.props;
      if (visible === false) return null;
      return <WrappedComponent {...props} />;
    }
  }
}
```

Here's a comparison of Mixins vs HOCs (source: [From Mixin to HOC to Hook | Juejin](https://juejin.im/post/5cad39b3f265da03502b1c0a#heading-27)):

![](http://airing.ursb.me/image/blog/15675688804829/15682047185109.jpg)

## 4. Render Props

Render Props are actually quite common — React's Context API is a good example:

```JavaScript
class App extends React.Component {
   render() {
     return (
       <ThemeProvider>
         <ThemeContext.Consumer>
           {val => <div>{val}</div>}
         </ThemeContext.Consumer>
       </ThemeProvider>
     )
   }
 }
```

Since React props aren't limited to a specific type — they can be functions — you get the render props pattern. The idea is simple: instead of rendering a child component directly, you pass a callback. This lets the parent component receive the child's state and use it.

The downside is that render props suffer from the same Wrapper Hell problem as HOCs.

## 5. React Hooks

All of the above problems can be solved with Hooks. Hooks are arguably the ideal solution for reusing and extending component logic:

1. **No naming conflicts**: Hooks are similar to Mixins in some ways, but where Mixin-introduced logic and state can overwrite each other, multiple Hooks remain completely independent.
2. **No Wrapper Hell**: Think of it like async/await solving callback hell — Hooks flatten the component tree.
3. **Best of both worlds**: Hooks preserve all the advantages of Functional Components (covered in the first post), while also enabling state, lifecycle effects, and refs via `useState`, `useEffect`, `useRef`, and friends — eliminating the traditional limitations of function components.

We'll look at the Hooks implementation in detail in the next post.
