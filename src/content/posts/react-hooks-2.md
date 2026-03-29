---
title: "React Hooks 源码解析（2）: 组件逻辑复用与扩展"
date: 2019-09-11
tags: ["tech"]
description: ""
---

> React 源码版本: v16.9.0
> 源码注释笔记：[airingursb/react](https://github.com/airingursb/react)

如何复用和扩展 React 组件的状态逻辑？具体而言，有以下五种方案：

1. Mixins
2. Class Inheritance
3. Higher-Order Component
4. Render Props
5. React Hooks

下面，我们一一介绍五种方案的实现。

## 1. Mixins

![Mixins](http://airing.ursb.me/image/blog/15675688804829/0AA936A7-1AB6-4B23-BD7A-D26B27C98DF4.png)


Mixins 混合，其将一个对象的属性拷贝到另一个对象上面去，其实就是对象的融合，它的出现主要就是为了解决代码复用问题。

> 扩展：说到对象融合，`Object.assign` 也是常用的方法，它跟 Mixins 有一个重大的区别在于 Mixins 会把原型链上的属性一并复制过去（因为`for...in`），而 `Object.assign` 则不会。

由于现在 React 已经不再支持 Mixin 了，所以本文不再赘述其如何使用。至于以前在 React 中如何使用 Mixin ，请参考这篇文章：[React Mixin 的使用 | segmentfault](https://segmentfault.com/a/1190000003016446)

Mixins 虽然能解决代码复用的问题，但是其会产生许多问题，甚至弊大于利，由此 React 现在已经不支持 Mixins 了。具体而言，有以下几个缺点：

1. **代码过于耦合**：Mixins 引入了隐藏的依赖关系，代码之间可能会相互依赖，相互耦合，不利于代码维护。
2. **名称相同的 Mixin 不可以同时使用**：比如 `FluxListenerMixin` 定义 `handleChange()` 和 `WindowSizeMixin` 定义`handleChange()`，则不能同时使用它们，甚至我们也无法在自己的组件上定义具有此名称的方法。
3. **雪球效应的复杂度**：Mixins 数量比较多的时候，组件是可以感知到的，甚至组件代码中还要为其做相关处理增加 Hack 逻辑，这样会给代码造成滚雪球式的复杂性。

## 2. Class Inheritance

说到类组件的代码逻辑复用，熟悉 OOP 的同学肯定第一时间想到了类的继承，A 组件只要继承 B 组件就可以复用父类中的方法。但同样的，我也相信使用 React 的同学不会用继承的方法去复用组件的逻辑。

这里主要的考虑是代码质量问题，如果两个组件本身业务比较复杂，做成继承的方式就很不好，阅读子组件代码的时候，对于那么不明就里的、没有在该组件中声明的方法还需要跑到去父组件里去定位，而 React 希望一个组件只专注于一件事。

另外，如果重写子组件的生命周期，那父组件的生命周期会被覆盖，这也是我们在开发中不愿意看到的。

Facebook 对在 React 中使用继承这件事“深恶痛绝”，官网在 [Composition vs Inheritance](https://reactjs.org/docs/composition-vs-inheritance.html) 一文中写到：“在 Facebook，我们在成百上千个组件中使用 React，我们并没有发现需要使用继承来构建组件层次的情况。”

的确，函数式编程和组件式编程思想某种意义上是一致的，它们都是“组合的艺术”，一个大的函数可以有多个职责单一的函数组合而成。同样的，组件也是如此。我们做 React 开发时，总是会不停规划组件，将大组件拆分成子组件，对组件做更细粒度的控制，从而保证组件的纯净性，使得组件的职责更单一、更独立。组合带来的好处就是可复用性、可测试性和可预测性。

因此，**优先考虑组合**，才去考虑继承，并且 Facebook 在官网的文章中推荐使用 HOC 去实现组件的逻辑复用（详见《[Higher-Order Components](https://reactjs.org/docs/higher-order-components.html)》），那下面我们就来看一看 HOC 到底是什么。

## 3. HOC（Higher-Order Component）

HOC，Higher-Order Component，即高阶组件。虽然名字很高级，但其实和高阶函数一样并没有什么神奇的地方。

回顾一下高阶函数的定义：

1. 函数可以作为参数被传递
2. 函数可以作为返回值输出

其实高阶组件也就是一个函数，且该函数接受一个组件作为参数，并返回一个新的组件。需要注意的是高阶组件是一个函数，并不是一个组件。可见 HOC 其实就是一个装饰器，因此也可以使用 ES 7 中的装饰器语法，而本文为了代码的直观性就不使用装饰器语法了。

> 扩展阅读：装饰器提案 [proposal-decorators | GitHub](https://github.com/tc39/proposal-decorators)

![](http://airing.ursb.me/image/blog/15675688804829/15682018265752.jpg)

高阶组件也有两种实现：

1. 继承式的 HOC：即反向继承 Inheritance Inversion
2. 代理式的 HOC：即属性代理 Props Proxy

由于继承官方不推崇，继承式的 HOC 可能会原始组件的逻辑而并非简单的复用和扩展，因此继承式的 HOC 依然有许多弊端，我们这里就列一段代码展示一下，但就不展开讲了。

```JavaScript
// 继承式 HOC

import React, { Component } from 'react'

export default const HOC = (WrappedComponent) => class NewComponent extends WrappedComponent {
    
    componentWillMount() {
        console.log('这里会修改原始组件的生命周期')
    }

    render() {
        const element = super.render()
        const newProps = { ...this.props, style: { color: 'red' }}
        return React.cloneElement(element, newProps, element.props.children)
    }
}
```

可以看到继承式的 HOC 也确实可以复用和扩展原始组件的逻辑。而代理式的 HOC 更加简单，接下来举个例子来看看，该案例具体的项目代码可以点下面按钮进入调试：

[![Edit HOC](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/hoc-0c2hi?fontsize=14)


![](http://airing.ursb.me/image/blog/15675688804829/15681160373048.jpg)


这里有两个组件 Profile 和 Home，两个组件都被 Container 包裹，且每个 Container 的样式一样并且都有一个 title。这里我们希望 Profile 和 Home 都可以复用 Container 的样式和结构，现在我们用 HOC 实现一下：


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

可以发现这里的 HOC 其实本质上是原始组件的一个代理，在新组件的 render 函数中，将被包裹组件渲染出来，除了 HOC 自己要做的工作，其余功能全都转手给了被包裹的组件。

而 Redux 的 `connect` 函数其实也是 HOC 的一个应用。

```JavaScript
ConnectedComment = connect(mapStateToProps, mapDispatchToProps)(Component);
```

等同于

```JavaScript
// connect是一个返回函数的函数（就是个高阶函数）
const enhance = connect(mapStateToProps, mapDispatchToProps);
// 返回的函数就是一个高阶组件，该高阶组件返回一个与Redux store
// 关联起来的新组件
const ConnectedComment = enhance(Component);
```

![Redux connect](http://airing.ursb.me/image/blog/15675688804829/15681177303582.jpg)

另外，还有 antd 的 Form 也是用 HOC 实现的。

```JavaScript
const WrappedNormalLoginForm = Form.create()(NormalLoginForm);
```

虽然 HOC 在组件逻辑复用上提供了很多便利，也有许多项目会使用这种模式，但 HOC 还是存在一些缺点的：

1. Wrapper Hell，组件层级嵌套过多（Debug 过 Redux 的必然深有体会），这让调试变得非常困难。
2. 为了在 Debug 中显示组件名，需要显示声明组件的 `displayName`
3. 对 Typescript 类型化不够友好
4. 无法完美地使用 ref（注：React 16.3 中提供了 [React.forwardRef](http://react.html.cn/docs/forwarding-refs.html) 可以转发 ref，解决了这个问题）
5. 静态属性需要手动拷贝：当我们应用 HOC 去增强另一个组件时，我们实际使用的组件已经不是原组件了，所以我们拿不到原组件的任何静态属性，我们可以在 HOC 的结尾手动拷贝它们。
6. 透传了不相关的 props：HOC 可以劫持 props，在不遵守约定的情况下可以覆盖掉透传的 props。另外，这也导致中间组件也接受了不相关的 props，代码可读性变差。

```Javascript
/**
 * 使用高阶组件，我们可以代理所有的props，但往往特定的HOC只会用到其中的一个或几个props。
 * 我们需要把其他不相关的props透传给原组件
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

下图对比了 Mixin 和 HOC 的差异：（图源：[【React深入】从Mixin到HOC再到Hook](https://juejin.im/post/5cad39b3f265da03502b1c0a#heading-27)）

![](http://airing.ursb.me/image/blog/15675688804829/15682047185109.jpg)


## 4. Render Props

Render Props 其实很常见，比如 React Context API：

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

React 的 props 并没有限定类型，它可以是一个函数，于是就有了 render props，这种模式也很常见。它的实现思路很简单，把原来该放组件的地方，换成了回调，这样当前组件里就可以拿到子组件的状态并使用。

但是，这会产生和 HOC 一样的 Wrapper Hell 问题。

## 5. React Hooks

而以上的问题，使用 Hooks 均可以得到解决，Hooks 可谓是组件逻辑复用扩展的完美方案。具体而言，有以下优点：

1. 避免命名冲突：Hook 和 Mixin 在用法上有一定的相似之处，但是 Mixin 引入的逻辑和状态是可以相互覆盖的，而多个 Hook 之间互不影响。
2. 避免 Wrapper Hell：原理类似于回调地狱之于 async + await。
3. Hooks 拥有Functional Component 的所有优点（请阅读该系列第一篇文章），同时若使用 useState、useEffect、useRef 等 Hook 可以在 Functional Component 中使用 State、生命周期和 ref，规避了 Functional Component 固有的缺点。

至于 Hooks 的具体实现，我们下一篇文章中再谈。


