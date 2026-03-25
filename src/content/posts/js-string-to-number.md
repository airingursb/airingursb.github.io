---
title: "引擎剖析：JS 中的字符串转数值"
date: 2022-05-03
tags: ["tech"]
description: ""
---

JS 中，字符串转数值的方式有以下 9 种：

- parseInt()
- parseFloat()
- Number()
- Double tilde (~~) Operator
- Unary Operator (+)
- Math.floor()
- Multiply with number
- The Signed Right Shift Operator(>>)
- The Unsigned Right Shift Operator(>>>)

这几种方式对运行结果的差异，如下表所示：

![](https://airing.ursb.me/image/blog/media/20220503/covert_string_to_number.png)> 对比表格的源码发布到了 [https://airing.ursb.me/web/int.html](https://airing.ursb.me/web/int.html)，需要可自取。

除了运行结果上的存在差异之外，这些方法在性能上也存在着差异。在 NodeJS V8 环境下，这几个方法微基准测试的结果如下：

```
parseInt() x 19,140,190 ops/sec ±0.45% (92 runs sampled)
parseFloat() x 28,203,053 ops/sec ±0.25% (95 runs sampled)
Number() x 1,041,209,524 ops/sec ±0.20% (90 runs sampled)
Double tilde (~~) Operator x 1,035,220,963 ops/sec ±1.65% (97 runs sampled)
Math.floor() x 28,224,678 ops/sec ±0.23% (96 runs sampled)
Unary Operator (+) x 1,045,129,381 ops/sec ±0.17% (95 runs sampled)
Multiply with number x 1,044,176,084 ops/sec ±0.15% (93 runs sampled)
The Signed Right Shift Operator(>>) x 1,046,016,782 ops/sec ±0.11% (96 runs sampled)
The Unsigned Right Shift Operator(>>>) x 1,045,384,959 ops/sec ±0.08% (96 runs sampled)
```
可见，`parseInt()`，`parseFloat()`，`Math.floor()` 的效率最低，只有其他运算 2% 左右的效率，而其中又以`parseInt()`最慢，仅有 1%。

为什么这些方法存在着这些差异？这些运算在引擎层又是如何被解释执行的？接下来将从 V8、JavaScriptCore、QuickJS 等主流 JS 引擎的视角，探究这些方法的具体实现。

首先来看看 `parsrInt()`。

## 1. parseInt()
[ECMAScript (ECMA-262) parseInt](https://tc39.es/ecma262/#sec-parseint-string-radix)
![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503111054.png)

### 1.1 V8 中的 parseInt()
在 V8  [→ src/init/bootstrapper.cc] 中定义了 JS 语言内置的标准对象，我们可以找到其中关于 `parseInt` 的定义：

`Handle<JSFunction> number_fun = InstallFunction(isolate_, global, "Number", JS_PRIMITIVE_WRAPPER_TYPE, JSPrimitiveWrapper::kHeaderSize, 0, isolate_->initial_object_prototype(), Builtin::kNumberConstructor);

// Install Number.parseInt and Global.parseInt.
Handle<JSFunction> parse_int_fun = SimpleInstallFunction(isolate_, number_fun, "parseInt", Builtin::kNumberParseInt, 2, true);

JSObject::AddProperty(isolate_, global_object, "parseInt", parse_int_fun,
 native_context()->set_global_parse_int_fun(*parse_int_fun);
`

可以见，Number.parseInt 和全局对象的 parseInt 都是基于 `SimpleInstallFunction` 注册的，它会将 API 安装到 isolate 中，并将该方法与 Builtin 做绑定。JS 侧调用 `pasreInt` 即为引擎侧调用 `Builtin::kNumberParseInt`。

Builtin (Built-in Functions) 是 V8 中在 VM 运行时可执行的代码块，用于表达运行时对 VM 的更改。目前 V8 版本中 Builtin 有下述 5 种实现方式：

- Platform-dependent assembly language：很高效，但需要手动适配到所有平台，并且难以维护。
- C++：风格与runtime functions非常相似，可以访问 V8 强大的运行时功能，但通常不适合性能敏感区域。
- JavaScript：缓慢的运行时调用，受类型污染导致的不可预测的性能影响，以及复杂的 JS语义问题。现在 V8 不再使用 JavaScript 内置函数。
- CodeStubAssembler：提供高效的低级功能，非常接近汇编语言，同时保持平台依赖无关性和可读性。
- Torque：是 CodeStubAssembler 的改进版，其语法结合了 TypeScript 的一些特征，非常简单易读。强调在不损失性能的前提下尽量降低使用难度，让 Builtin 的开发更加容易一些。目前不少内置函数都是由 Torque 实现的。

回到前文 `Builtin::kNumberParseInt` 这个函数，在 [→ src/builtins/builtins.h] 中可以看到其定义：

`// Convenience macro to avoid generating named accessors for all builtins.
#define BUILTIN_CODE(isolate, name) \
  (isolate)->builtins()->code_handle(i::Builtin::k##name)
`

因此这个函数注册的原名是 `NumberParseInt`，实现在 [→ src/builtins/number.tq] 中，是个基于 Torque 的 Builtin 实现。

`// ES6 #sec-number.parseint
transitioning javascript builtin NumberParseInt(
    js-implicit context: NativeContext)(value: JSAny, radix: JSAny): Number {
  return ParseInt(value, radix);
}

transitioning builtin ParseInt(implicit context: Context)(
    input: JSAny, radix: JSAny): Number {
  try {
    // Check if radix should be 10 (i.e. undefined, 0 or 10).
    if (radix != Undefined && !TaggedEqual(radix, SmiConstant(10)) &&
        !TaggedEqual(radix, SmiConstant(0))) {
      goto CallRuntime;
    }

    typeswitch (input) {
      case (s: Smi): {
        return s;
      }
      case (h: HeapNumber): {
        // Check if the input value is in Signed32 range.
        const asFloat64: float64 = Convert<float64>(h);
        const asInt32: int32 = Signed(TruncateFloat64ToWord32(asFloat64));
        // The sense of comparison is important for the NaN case.
        if (asFloat64 == ChangeInt32ToFloat64(asInt32)) goto Int32(asInt32);

        // Check if the absolute value of input is in the [1,1<<31[ range. Call
        // the runtime for the range [0,1[ because the result could be -0.
        const kMaxAbsValue: float64 = 2147483648.0;
        const absInput: float64 = math::Float64Abs(asFloat64);
        if (absInput < kMaxAbsValue && absInput >= 1.0) goto Int32(asInt32);
        goto CallRuntime;
      }
      case (s: String): {
        goto String(s);
      }
      case (HeapObject): {
        goto CallRuntime;
      }
    }
  } label Int32(i: int32) {
    return ChangeInt32ToTagged(i);
  } label String(s: String) {
    // Check if the string is a cached array index.
    const hash: NameHash = s.raw_hash_field;
    if (IsIntegerIndex(hash) &&
        hash.array_index_length < kMaxCachedArrayIndexLength) {
      const arrayIndex: uint32 = hash.array_index_value;
      return SmiFromUint32(arrayIndex);
    }
    // Fall back to the runtime.
    goto CallRuntime;
  } label CallRuntime {
    tail runtime::StringParseInt(input, radix);
  }
}
`

看这段代码前，先科普下 V8 中的几个数据结构：（V8 所有数据结构的定义可以见 [→ src/objects/objects.h]）

- Smi：继承自 Object，immediate small integer，只有 31 位
- HeapObject：继承自 Object，superclass for everything allocated in the heap
- PrimitiveHeapObject：继承自 HeapObject
- HeapNumber：继承自 PrimitiveHeapObject，存储了数字的堆对象，用于保存大整形的对象。

我们知道 `parseInt` 接收两个形参， 即 `parseInt(string, radix)`，此处亦如是。 实现流程如下：

- 首先判断 `radix` 是否没传或者传了 0 或 10，如果不是，那么则不是十进制的转换，就走 runtime 中提供的 `StringParseInt` 函数 `runtime::StringParseInt`；
- 如果是十进制转换就继续走，判断第一个参数的数据类型。
- 如果是 Smi 或者是没有越界（超 31 位）的 HeapNumber，那么就直接 return 入参，相当于没有转化；否则同样走  `runtime::StringParseInt`。注意如果这里越界了就会走 `ChangeInt32ToTagged`，其为 CodeStubAssembler 实现的一个函数，会强转 Int32，如果当前执行环境不允许溢出 32 位，那么转换之后的数字就会不合预期。
- 如果是 String，则判断是否是 hash，如果是的就找到对应整型 value 返回；否则依然走 `runtime::StringParseInt`。

那么焦点来到了 `runtime::StringParseInt`。[→ src/runtime/runtime-numbers.cc]

`// ES6 18.2.5 parseInt(string, radix) slow path
RUNTIME_FUNCTION(Runtime_StringParseInt) {
  HandleScope handle_scope(isolate);
  DCHECK_EQ(2, args.length());
  Handle<Object> string = args.at(0);
  Handle<Object> radix = args.at(1);

  // Convert {string} to a String first, and flatten it.
  Handle<String> subject;
  ASSIGN_RETURN_FAILURE_ON_EXCEPTION(isolate, subject,
                                     Object::ToString(isolate, string));
  subject = String::Flatten(isolate, subject);

  // Convert {radix} to Int32.
  if (!radix->IsNumber()) {
    ASSIGN_RETURN_FAILURE_ON_EXCEPTION(isolate, radix,
                                       Object::ToNumber(isolate, radix));
  }
  int radix32 = DoubleToInt32(radix->Number());
  if (radix32 != 0 && (radix32 < 2 || radix32 > 36)) {
    return ReadOnlyRoots(isolate).nan_value();
  }

  double result = StringToInt(isolate, subject, radix32);
  return *isolate->factory()->NewNumber(result);
}
`

这段逻辑比较简单，就不再一行行解读了。值得注意的是，根据标准，如果 `radix` 不在 2~36 的范围内，会返回 NaN。

### 1.2 JavaScriptCore 中的 parseInt()
接着我们来看看 JavaScriptCore 中的 `parseInt()`。

JavaScriptCore 中关于  JS 语言内置对象的注册都在 [→ runtime/JSGlobalObjectFuntions.cpp] 文件中：

`JSC_DEFINE_HOST_FUNCTION(globalFuncParseInt, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    JSValue value = callFrame->argument(0);
    JSValue radixValue = callFrame->argument(1);

    // Optimized handling for numbers:
    // If the argument is 0 or a number in range 10^-6 <= n < INT_MAX+1, then parseInt
    // results in a truncation to integer. In the case of -0, this is converted to 0.
    //
    // This is also a truncation for values in the range INT_MAX+1 <= n < 10^21,
    // however these values cannot be trivially truncated to int since 10^21 exceeds
    // even the int64_t range. Negative numbers are a little trickier, the case for
    // values in the range -10^21 < n <= -1 are similar to those for integer, but
    // values in the range -1 < n <= -10^-6 need to truncate to -0, not 0.
    static const double tenToTheMinus6 = 0.000001;
    static const double intMaxPlusOne = 2147483648.0;
    if (value.isNumber()) {
        double n = value.asNumber();
        if (((n < intMaxPlusOne && n >= tenToTheMinus6) || !n) && radixValue.isUndefinedOrNull())
            return JSValue::encode(jsNumber(static_cast<int32_t>(n)));
    }

    // If ToString throws, we shouldn't call ToInt32.
    return toStringView(globalObject, value, [&] (StringView view) {
        return JSValue::encode(jsNumber(parseInt(view, radixValue.toInt32(globalObject))));
    });
}
`

WebKit 中的代码注释都很详尽易读，这里也不再解读了。最后，会调用 `parseInt`，JavaScriptCore 的 `parseInt` 的实现全放在了 [→ runtime/ParseInt.h]  中，核心代码如下：

`ALWAYS_INLINE static bool isStrWhiteSpace(UChar c)
{
    // https://tc39.github.io/ecma262/#sec-tonumber-applied-to-the-string-type
    return Lexer<UChar>::isWhiteSpace(c) || Lexer<UChar>::isLineTerminator(c);
}

// ES5.1 15.1.2.2
template <typename CharType>
ALWAYS_INLINE
static double parseInt(StringView s, const CharType* data, int radix)
{
    // 1. Let inputString be ToString(string).
    // 2. Let S be a newly created substring of inputString consisting of the first character that is not a
    //    StrWhiteSpaceChar and all characters following that character. (In other words, remove leading white
    //    space.) If inputString does not contain any such characters, let S be the empty string.
    int length = s.length();
    int p = 0;
    while (p < length && isStrWhiteSpace(data[p]))
        ++p;

    // 3. Let sign be 1.
    // 4. If S is not empty and the first character of S is a minus sign -, let sign be -1.
    // 5. If S is not empty and the first character of S is a plus sign + or a minus sign -, then remove the first character from S.
    double sign = 1;
    if (p < length) {
        if (data[p] == '+')
            ++p;
        else if (data[p] == '-') {
            sign = -1;
            ++p;
        }
    }

    // 6. Let R = ToInt32(radix).
    // 7. Let stripPrefix be true.
    // 8. If R != 0,then
    //   b. If R != 16, let stripPrefix be false.
    // 9. Else, R == 0
    //   a. LetR = 10.
    // 10. If stripPrefix is true, then
    //   a. If the length of S is at least 2 and the first two characters of S are either ―0x or ―0X,
    //      then remove the first two characters from S and let R = 16.
    // 11. If S contains any character that is not a radix-R digit, then let Z be the substring of S
    //     consisting of all characters before the first such character; otherwise, let Z be S.
    if ((radix == 0 || radix == 16) && length - p >= 2 && data[p] == '0' && (data[p + 1] == 'x' || data[p + 1] == 'X')) {
        radix = 16;
        p += 2;
    } else if (radix == 0)
        radix = 10;

    // 8.a If R < 2 or R > 36, then return NaN.
    if (radix < 2 || radix > 36)
        return PNaN;

    // 13. Let mathInt be the mathematical integer value that is represented by Z in radix-R notation, using the letters
    //     A-Z and a-z for digits with values 10 through 35. (However, if R is 10 and Z contains more than 20 significant
    //     digits, every significant digit after the 20th may be replaced by a 0 digit, at the option of the implementation;
    //     and if R is not 2, 4, 8, 10, 16, or 32, then mathInt may be an implementation-dependent approximation to the
    //     mathematical integer value that is represented by Z in radix-R notation.)
    // 14. Let number be the Number value for mathInt.
    int firstDigitPosition = p;
    bool sawDigit = false;
    double number = 0;
    while (p < length) {
        int digit = parseDigit(data[p], radix);
        if (digit == -1)
            break;
        sawDigit = true;
        number *= radix;
        number += digit;
        ++p;
    }

    // 12. If Z is empty, return NaN.
    if (!sawDigit)
        return PNaN;

    // Alternate code path for certain large numbers.
    if (number >= mantissaOverflowLowerBound) {
        if (radix == 10) {
            size_t parsedLength;
            number = parseDouble(s.substring(firstDigitPosition, p - firstDigitPosition), parsedLength);
        } else if (radix == 2 || radix == 4 || radix == 8 || radix == 16 || radix == 32)
            number = parseIntOverflow(s.substring(firstDigitPosition, p - firstDigitPosition), radix);
    }

    // 15. Return sign x number.
    return sign * number;
}

ALWAYS_INLINE static double parseInt(StringView s, int radix)
{
    if (s.is8Bit())
        return parseInt(s, s.characters8(), radix);
    return parseInt(s, s.characters16(), radix);
}

template<typename CallbackWhenNoException>
static ALWAYS_INLINE typename std::invoke_result<CallbackWhenNoException, StringView>::type toStringView(JSGlobalObject* globalObject, JSValue value, CallbackWhenNoException callback)
{
    VM& vm = getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    JSString* string = value.toStringOrNull(globalObject);
    EXCEPTION_ASSERT(!!scope.exception() == !string);
    if (UNLIKELY(!string))
        return { };
    auto viewWithString = string->viewWithUnderlyingString(globalObject);
    RETURN_IF_EXCEPTION(scope, { });
    RELEASE_AND_RETURN(scope, callback(viewWithString.view));
}

// Mapping from integers 0..35 to digit identifying this value, for radix 2..36.
const char radixDigits[] = "0123456789abcdefghijklmnopqrstuvwxyz";
`

直接贴出了代码，因为 JavaScriptCore 中的 API 都是严格按照  [ECMAScript (ECMA-262) parseInt](https://tc39.es/ecma262/#sec-parseint-string-radix) 标准一步一步按流程实现，可读性和注释也很好，强烈建议读者自己阅读一下，此处不再解读。

### 1.3 QuickJS 中的 parseInt()
QuickJS 的核心代码都在 [→ quickjs.c] 中，首先是 `parseInt` 的注册代码：

`/* global object */
static const JSCFunctionListEntry js_global_funcs[] = {
    JS_CFUNC_DEF("parseInt", 2, js_parseInt ),
//...
}
`

`js_parseInt` 的实现逻辑如下：

`static JSValue js_parseInt(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *str, *p;
    int radix, flags;
    JSValue ret;

    str = JS_ToCString(ctx, argv[0]);
    if (!str)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &radix, argv[1])) {
        JS_FreeCString(ctx, str);
        return JS_EXCEPTION;
    }
    if (radix != 0 && (radix < 2 || radix > 36)) {
        ret = JS_NAN;
    } else {
        p = str;
        p += skip_spaces(p);
        flags = ATOD_INT_ONLY | ATOD_ACCEPT_PREFIX_AFTER_SIGN;
        ret = js_atof(ctx, p, NULL, radix, flags);
    }
    JS_FreeCString(ctx, str);
    return ret;
}
`

Bellard 大神的代码注释很少，但同时也非常精炼。

至此，本文介绍完了三个引擎下各自 `parseInt` 的实现，三者都是基于标准的实现，但由于代码风格不同，读起来也像是阅读三个风格不同散文大家的作品。

不过标准和实现，我们可以发现 `parseInt` 在真正执行字符串转数字这个操作做了非常多的前置操作，如入参合法判断、入参默认值、字符串格式判断与规整化、越界判断等等，最后再交由 runtime 处理。因此，我们不难推出其效率略低的原因。

接下来，我们再简单看看 `parseFloat`。

## 2. parseFloat()
[ECMAScript (ECMA-262) parseFloat](https://tc39.es/ecma262/#sec-parsefloat-string)
![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503110924.png)

根据标准，parseFloat 与 parseInt 有两点明显的不同：

- 仅支持一个入参，不支持进制转换
- 返回值支持浮点型

### 2.1 V8 中的 parseFloat()
V8 中 `parseFloat` 的相关逻辑都紧挨着 `parseInt`，这里直接贴出关键实现：

[→ src/builtins/number.tq]

`// ES6 #sec-number.parsefloat
transitioning javascript builtin NumberParseFloat(
    js-implicit context: NativeContext)(value: JSAny): Number {
  try {
    typeswitch (value) {
      case (s: Smi): {
        return s;
      }
      case (h: HeapNumber): {
        // The input is already a Number. Take care of -0.
        // The sense of comparison is important for the NaN case.
        return (Convert<float64>(h) == 0) ? SmiConstant(0) : h;
      }
      case (s: String): {
        goto String(s);
      }
      case (HeapObject): {
        goto String(string::ToString(context, value));
      }
    }
  } label String(s: String) {
    // Check if the string is a cached array index.
    const hash: NameHash = s.raw_hash_field;
    if (IsIntegerIndex(hash) &&
        hash.array_index_length < kMaxCachedArrayIndexLength) {
      const arrayIndex: uint32 = hash.array_index_value;
      return SmiFromUint32(arrayIndex);
    }
    // Fall back to the runtime to convert string to a number.
    return runtime::StringParseFloat(s);
  }
}
`

[→ src/runtime/runtime-numbers.cc]

`// ES6 18.2.4 parseFloat(string)
RUNTIME_FUNCTION(Runtime_StringParseFloat) {
  HandleScope shs(isolate);
  DCHECK_EQ(1, args.length());
  Handle<String> subject = args.at<String>(0);

  double value = StringToDouble(isolate, subject, ALLOW_TRAILING_JUNK,
                                std::numeric_limits<double>::quiet_NaN());

  return *isolate->factory()->NewNumber(value);
}
`

因标准中的流程更为简易，因此较 `parseInt` 而言， `parseFloat` 更加简单易读。

### 2.2 JavaScriptCore 中的 parseFloat()
在 JavaScriptCore 中，`parseFloat` 的逻辑则更加简洁明了：

`static double parseFloat(StringView s)
{
    unsigned size = s.length();

    if (size == 1) {
        UChar c = s[0];
        if (isASCIIDigit(c))
            return c - '0';
        return PNaN;
    }

    if (s.is8Bit()) {
        const LChar* data = s.characters8();
        const LChar* end = data + size;

        // Skip leading white space.
        for (; data < end; ++data) {
            if (!isStrWhiteSpace(*data))
                break;
        }

        // Empty string.
        if (data == end)
            return PNaN;

        return jsStrDecimalLiteral(data, end);
    }

    const UChar* data = s.characters16();
    const UChar* end = data + size;

    // Skip leading white space.
    for (; data < end; ++data) {
        if (!isStrWhiteSpace(*data))
            break;
    }

    // Empty string.
    if (data == end)
        return PNaN;

    return jsStrDecimalLiteral(data, end);
}
`

### 2.3 QuickJS 中的 parseFloat()
而对比 JavaScriptCore，QuickJS 则短短 12 行：

[→ quickjs.c]

`static JSValue js_parseFloat(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    const char *str, *p;
    JSValue ret;

    str = JS_ToCString(ctx, argv[0]);
    if (!str)
        return JS_EXCEPTION;
    p = str;
    p += skip_spaces(p);
    ret = js_atof(ctx, p, NULL, 10, 0);
    JS_FreeCString(ctx, str);
    return ret;
}
`

不过对比之后可以知道，QuickJS 这里之所以短小，是没有做 ASCII 和 8Bit 的兼容。阅读 [ECMAScript (ECMA-262) parseFloat](https://tc39.es/ecma262/#sec-parsefloat-string) 之后可以发现，QuickJS 这里的处理其实没有什么问题，最新的标准中并没有要求解释器要这样的兼容。

## 3. Number()
[ECMAScript (ECMA-262) Number ( value )](https://tc39.es/ecma262/#sec-number-constructor-number-value)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503110831.png)### 3.1 V8 中的 Number()
Number 作为全局对象，定义还是在  [→ src/init/bootstrapper.cc] 中，在前文介绍 `Number.parseInt` 的注册时已然介绍过，我们回顾下：

`Handle<JSFunction> number_fun = InstallFunction(
        isolate_, global, "Number", JS_PRIMITIVE_WRAPPER_TYPE,
        JSPrimitiveWrapper::kHeaderSize, 0,
        isolate_->initial_object_prototype(), Builtin::kNumberConstructor);
number_fun->shared().DontAdaptArguments();
number_fun->shared().set_length(1);
InstallWithIntrinsicDefaultProto(isolate_, number_fun,
                                     Context::NUMBER_FUNCTION_INDEX);

// Create the %NumberPrototype%
Handle<JSPrimitiveWrapper> prototype = Handle<JSPrimitiveWrapper>::cast(
        factory->NewJSObject(number_fun, AllocationType::kOld));
prototype->set_value(Smi::zero());
JSFunction::SetPrototype(number_fun, prototype);

// Install the "constructor" property on the {prototype}.
JSObject::AddProperty(isolate_, prototype, factory->constructor_string(),
                          number_fun, DONT_ENUM);
`

这段代码处理注册了 `Number` 这个对象之外，还初始化了它的原型链，并把构造函数添加到了它的原型链上。构造函数 `Builtin::kNumberConstructor` 是 Torque 实现的 Builtin，[→ src/builtins/constructor.tq] ，具体实现如下：

`// ES #sec-number-constructor
transitioning javascript builtin
NumberConstructor(
    js-implicit context: NativeContext, receiver: JSAny, newTarget: JSAny,
    target: JSFunction)(...arguments): JSAny {
  // 1. If no arguments were passed to this function invocation, let n be +0.
  let n: Number = 0;
  if (arguments.length > 0) {
    // 2. Else,
    //    a. Let prim be ? ToNumeric(value).
    //    b. If Type(prim) is BigInt, let n be the Number value for prim.
    //    c. Otherwise, let n be prim.
    const value = arguments[0];
    n = ToNumber(value, BigIntHandling::kConvertToNumber);
  }

  // 3. If NewTarget is undefined, return n.
  if (newTarget == Undefined) return n;

  // 4. Let O be ? OrdinaryCreateFromConstructor(NewTarget,
  //    "%NumberPrototype%", « [[NumberData]] »).
  // 5. Set O.[[NumberData]] to n.
  // 6. Return O.

  // We ignore the normal target parameter and load the value from the
  // current frame here in order to reduce register pressure on the fast path.
  const target: JSFunction = LoadTargetFromFrame();
  const result = UnsafeCast<JSPrimitiveWrapper>(
      FastNewObject(context, target, UnsafeCast<JSReceiver>(newTarget)));
  result.value = n;
  return result;
}
`

注释中的 1-6 一一对应着[ECMAScript (ECMA-262) Number ( value )]标准中的流程 1-6，因此本文不再花篇章赘述其实现。需要注意的是，标准中明确说明了 Number 是支持 BigInt 的，各引擎的实现也着重注意了这点，这也证明了我们之前运算对照表中的结果。

### 3.2 JavaScriptCore 中的 Number()
JavaScriptCore 中的这段代码则缺少注释，但逻辑上与 V8 一模一样，遵循标准：

[→ runtime/NumberConstructor.cpp]

`// ECMA 15.7.1
JSC_DEFINE_HOST_FUNCTION(constructNumberConstructor, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);
    double n = 0;
    if (callFrame->argumentCount()) {
        JSValue numeric = callFrame->uncheckedArgument(0).toNumeric(globalObject);
        RETURN_IF_EXCEPTION(scope, { });
        if (numeric.isNumber())
            n = numeric.asNumber();
        else {
            ASSERT(numeric.isBigInt());
            numeric = JSBigInt::toNumber(numeric);
            ASSERT(numeric.isNumber());
            n = numeric.asNumber();
        }
    }

    JSObject* newTarget = asObject(callFrame->newTarget());
    Structure* structure = JSC_GET_DERIVED_STRUCTURE(vm, numberObjectStructure, newTarget, callFrame->jsCallee());
    RETURN_IF_EXCEPTION(scope, { });

    NumberObject* object = NumberObject::create(vm, structure);
    object->setInternalValue(vm, jsNumber(n));
    return JSValue::encode(object);
}
`

### 3.3 QuickJS 中的 Number()
Number 对象及其原型链的注册代码如下所示：

[→ quickjs.c]

`void JS_AddIntrinsicBaseObjects(JSContext *ctx)
{
//...

/* Number */
    ctx->class_proto[JS_CLASS_NUMBER] = JS_NewObjectProtoClass(ctx, ctx->class_proto[JS_CLASS_OBJECT], JS_CLASS_NUMBER);
    
    JS_SetObjectData(ctx, ctx->class_proto[JS_CLASS_NUMBER], JS_NewInt32(ctx, 0));
    JS_SetPropertyFunctionList(ctx, ctx->class_proto[JS_CLASS_NUMBER], js_number_proto_funcs, countof(js_number_proto_funcs));
    
    number_obj = JS_NewGlobalCConstructor(ctx, "Number", js_number_constructor, 1, ctx->class_proto[JS_CLASS_NUMBER]);
    
    JS_SetPropertyFunctionList(ctx, number_obj, js_number_funcs, countof(js_number_funcs));
}
`

同样的时候，在原型链注册的时候绑上了构造函数 `js_number_constructor` ：

`static JSValue js_number_constructor(JSContext *ctx, JSValueConst new_target,
                                     int argc, JSValueConst *argv)
{
    JSValue val, obj;
    if (argc == 0) {
        val = JS_NewInt32(ctx, 0);
    } else {
        val = JS_ToNumeric(ctx, argv[0]);
        if (JS_IsException(val))
            return val;
        switch(JS_VALUE_GET_TAG(val)) {
#ifdef CONFIG_BIGNUM
        case JS_TAG_BIG_INT:
        case JS_TAG_BIG_FLOAT:
            {
                JSBigFloat *p = JS_VALUE_GET_PTR(val);
                double d;
                bf_get_float64(&p->num, &d, BF_RNDN);
                JS_FreeValue(ctx, val);
                val = __JS_NewFloat64(ctx, d);
            }
            break;
        case JS_TAG_BIG_DECIMAL:
            val = JS_ToStringFree(ctx, val);
            if (JS_IsException(val))
                return val;
            val = JS_ToNumberFree(ctx, val);
            if (JS_IsException(val))
                return val;
            break;
#endif
        default:
            break;
        }
    }
    if (!JS_IsUndefined(new_target)) {
        obj = js_create_from_ctor(ctx, new_target, JS_CLASS_NUMBER);
        if (!JS_IsException(obj))
            JS_SetObjectData(ctx, obj, val);
        return obj;
    } else {
        return val;
    }
}
`

值得关注的是 QuickJS 追求精简小巧，因此可以自行配置是否支持 BigInt，其余逻辑依然遵循标准。

## 4. Double tilde (~~) Operator
[ECMAScript (ECMA-262) Bitwise NOT Operator](https://tc39.es/ecma262/#sec-bitwise-not-operator-runtime-semantics-evaluation)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503113745.png)使用 ~ 运算符利用到了标准中的第 2 步，对被计算的值做类型转换，从而将字符串转成数值。这里我们关注这个环节具体是在引擎中的哪个步骤完成的。

### 4.1 V8 中的 BitwiseNot
首先看看 V8 中对一元运算符的判断：

[→ src/parsing/token.h]

`static bool IsUnaryOp(Value op) { return base::IsInRange(op, ADD, VOID); }
`

定义在 ADD 和 VOID 范围内的 op，都是一元运算符，具体包括 (可见 [→ src/parsing/token.h])，其中 SUB 和 ADD 定义在二元运算符列表的末端，在 IsUnaryOp 中它们也会命中一元符的判断：

`E(T, ADD, "+", 12)
E(T, SUB, "-", 12)
T(NOT, "!", 0)
T(BIT_NOT, "~", 0)
K(DELETE, "delete", 0)
K(TYPEOF, "typeof", 0)
K(VOID, "void", 0)
`

之后进入语法分析阶段，解析 AST 树的过程中，遇到一元运算符会做相应的处理，先调用 `ParseUnaryOrPrefixExpression` 之后构建一元运算符表达式 `BuildUnaryExpression`：

[→ src/parsing/parser-base.h]

`template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseUnaryExpression() {
  // UnaryExpression ::
  //   PostfixExpression
  //   'delete' UnaryExpression
  //   'void' UnaryExpression
  //   'typeof' UnaryExpression
  //   '++' UnaryExpression
  //   '--' UnaryExpression
  //   '+' UnaryExpression
  //   '-' UnaryExpression
  //   '~' UnaryExpression
  //   '!' UnaryExpression
  //   [+Await] AwaitExpression[?Yield]

  Token::Value op = peek();
  // 一元运算符处理
  if (Token::IsUnaryOrCountOp(op)) return ParseUnaryOrPrefixExpression();
  if (is_await_allowed() && op == Token::AWAIT) {
// await 处理
    return ParseAwaitExpression();
  }
  return ParsePostfixExpression();
}
`

`template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseUnaryOrPrefixExpression() {
//...

//...
 // Allow the parser's implementation to rewrite the expression.
   return impl()->BuildUnaryExpression(expression, op, pos);
}
`

[→ src/parsing/parser.cc]

`Expression* Parser::BuildUnaryExpression(Expression* expression,
                                         Token::Value op, int pos) {
  DCHECK_NOT_NULL(expression);
  const Literal* literal = expression->AsLiteral();
  if (literal != nullptr) {
// !
    if (op == Token::NOT) {
      // Convert the literal to a boolean condition and negate it.
      return factory()->NewBooleanLiteral(literal->ToBooleanIsFalse(), pos);
    } else if (literal->IsNumberLiteral()) {
      // Compute some expressions involving only number literals.
      double value = literal->AsNumber();
      switch (op) {
    // +
        case Token::ADD:
          return expression;
        // -
        case Token::SUB:
          return factory()->NewNumberLiteral(-value, pos);
        // ~
        case Token::BIT_NOT:
          return factory()->NewNumberLiteral(~DoubleToInt32(value), pos);
        default:
          break;
      }
    }
  }
  return factory()->NewUnaryOperation(op, expression, pos);
}
`

如果字面量是数值型且一元运算符此刻不是 NOT（!），那么会把 Value 会转成 Number，如果是 BIT_NOT 再转成 INT32 进行取反运算。

### 4.2 JavaScriptCore 中的 BitwiseNot
同样在语法分析生成 AST 阶段，处理到 TILDE（~） 这个 token 后，创建表达式时会做类型转换的工作：

[→ Parser/Parser.cpp]

`template <typename LexerType>
template <class TreeBuilder> TreeExpression Parser<LexerType>::parseUnaryExpression(TreeBuilder& context)
{
//... 省略无关代码
 while (tokenStackDepth) {
 switch (tokenType) {
//... 省略无关代码
// ~
case TILDE:
     expr = context.makeBitwiseNotNode(location, expr);
     break;
     // +
case PLUS:
      expr = context.createUnaryPlus(location, expr);
     break;
//... 省略无关代码
}
}
}
`

[→ parser/ASTBuilder.h]

`ExpressionNode* ASTBuilder::makeBitwiseNotNode(const JSTokenLocation& location, ExpressionNode* expr)
{
if (expr->isNumber())
        return createIntegerLikeNumber(location, ~toInt32(static_cast<NumberNode*>(expr)->value()));
    return new (m_parserArena) BitwiseNotNode(location, expr);
}
`

[→ parser/NodeConstructors.h]

`inline BitwiseNotNode::BitwiseNotNode(const JSTokenLocation& location, ExpressionNode* expr)
        : UnaryOpNode(location, ResultType::forBitOp(), expr, op_bitnot)
{
}
`

[→ parser/ResultType.h]

`static constexpr ResultType forBitOp()
{
    return bigIntOrInt32Type();
}

static constexpr ResultType bigIntOrInt32Type()
{
    return ResultType(TypeMaybeBigInt | TypeInt32 | TypeMaybeNumber);
}
`

### 4.3 QuickJS 中的 BitwiseNot
QuickJS 在语法分析阶段，遇到 ~ 这个 token 会调用 `emit_op(s, OP_not)`：

[→ quickjs.c]

`/* allowed parse_flags: PF_ARROW_FUNC, PF_POW_ALLOWED, PF_POW_FORBIDDEN */
static __exception int js_parse_unary(JSParseState *s, int parse_flags)
{
    int op;

    switch(s->token.val) {
    case '+':
    case '-':
    case '!':
    case '~':
    case TOK_VOID:
        op = s->token.val;
        if (next_token(s))
            return -1;
        if (js_parse_unary(s, PF_POW_FORBIDDEN))
            return -1;
        switch(op) {
        case '-':
            emit_op(s, OP_neg);
            break;
        case '+':
            emit_op(s, OP_plus);
            break;
        case '!':
            emit_op(s, OP_lnot);
            break;
        case '~':
            emit_op(s, OP_not);
            break;
        case TOK_VOID:
            emit_op(s, OP_drop);
            emit_op(s, OP_undefined);
            break;
        default:
            abort();
        }
        parse_flags = 0;
        break;
//...
}
    //...
    }
}
`

`emit_op` 会生成 OP_not 字节码操作符，并将源码保存在 fd->byte_code 里。

`static void emit_op(JSParseState *s, uint8_t val)
{
    JSFunctionDef *fd = s->cur_func;
    DynBuf *bc = &fd->byte_code;

    /* Use the line number of the last token used, not the next token,
       nor the current offset in the source file.
     */
    if (unlikely(fd->last_opcode_line_num != s->last_line_num)) {
        dbuf_putc(bc, OP_line_num);
        dbuf_put_u32(bc, s->last_line_num);
        fd->last_opcode_line_num = s->last_line_num;
    }
    fd->last_opcode_pos = bc->size;
    dbuf_putc(bc, val);
}

int dbuf_putc(DynBuf *s, uint8_t c)
{
return dbuf_put(s, &c, 1);
}

int dbuf_put(DynBuf *s, const uint8_t *data, size_t len)
{
    if (unlikely((s->size + len) > s->allocated_size)) {
        if (dbuf_realloc(s, s->size + len))
            return -1;
    }
    memcpy(s->buf + s->size, data, len);
    s->size += len;
    return 0;
}
`

QuickJS 解释执行的函数是 `JS_EvalFunctionInternal`，其会调用 `JS_CallFree` 进行字节码的解释执行，其核心逻辑是调用的 `JS_CallInternal` 函数。

`/* argv[] is modified if (flags & JS_CALL_FLAG_COPY_ARGV) = 0. */
static JSValue JS_CallInternal(JSContext *caller_ctx, JSValueConst func_obj,
                               JSValueConst this_obj, JSValueConst new_target,
                               int argc, JSValue *argv, int flags)
{
    JSRuntime *rt = caller_ctx->rt;
    JSContext *ctx;
    JSObject *p;
    JSFunctionBytecode *b;
    JSStackFrame sf_s, *sf = &sf_s;
    const uint8_t *pc;
// ...省略无关代码

for(;;) {
int call_argc;
JSValue *call_argv;
SWITCH(pc) {
// ...
CASE(OP_not):
{
JSValue op1;
op1 = sp[-1];
// 如果是整型
if (JS_VALUE_GET_TAG(op1) == JS_TAG_INT) {
sp[-1] = JS_NewInt32(ctx, ~JS_VALUE_GET_INT(op1));
// 如果不是整型
} else {
if (js_not_slow(ctx, sp))
goto exception;
}
}
BREAK;
// ...
}
// ...
}
`

可见，解析到 OP_not 时， 如果是整型就直接取反，否则就调用 `js_not_slow`：

`static no_inline int js_not_slow(JSContext *ctx, JSValue *sp)
{
    int32_t v1;

    if (unlikely(JS_ToInt32Free(ctx, &v1, sp[-1]))) {
        sp[-1] = JS_UNDEFINED;
        return -1;
    }
    sp[-1] = JS_NewInt32(ctx, ~v1);
    return 0;
}
`

`js_not_slow` 会尝试转整型，转不了就转 -1，转的了就转整型后取反。`JS_ToInt32Free` 转换逻辑如下：

`/* return (<0, 0) in case of exception */
static int JS_ToInt32Free(JSContext *ctx, int32_t *pres, JSValue val)
{
 redo:
tag = JS_VALUE_GET_NORM_TAG(val);
switch(tag) {
case JS_TAG_INT:
case JS_TAG_BOOL:
case JS_TAG_NULL:
case JS_TAG_UNDEFINED:
ret = JS_VALUE_GET_INT(val);
break;
// ...
default:
val = JS_ToNumberFree(ctx, val);
if (JS_IsException(val)) {
*pres = 0;
return -1;
}
goto redo;
}
    *pres = ret;
    return 0;
}
`

对于字符串，会走到 `JS_ToNumberFree`，之后调用 `JS_ToNumberHintFree`，涉及到字符串处理的核心逻辑如下：

`static JSValue JS_ToNumberHintFree(JSContext *ctx, JSValue val,
                                   JSToNumberHintEnum flag)
{
    uint32_t tag;
    JSValue ret;

 redo:
    tag = JS_VALUE_GET_NORM_TAG(val);
    switch(tag) {
    // ...省略无关逻辑
case JS_TAG_STRING:
        {
            const char *str;
            const char *p;
            size_t len;
            
            str = JS_ToCStringLen(ctx, &len, val);
            JS_FreeValue(ctx, val);
            if (!str)
                return JS_EXCEPTION;
            p = str;
            p += skip_spaces(p);
            if ((p - str) == len) {
                ret = JS_NewInt32(ctx, 0);
            } else {
                int flags = ATOD_ACCEPT_BIN_OCT;
                ret = js_atof(ctx, p, &p, 0, flags);
                if (!JS_IsException(ret)) {
                    p += skip_spaces(p);
                    if ((p - str) != len) {
                        JS_FreeValue(ctx, ret);
                        ret = JS_NAN;
                    }
                }
            }
            JS_FreeCString(ctx, str);
        }
        break;
// ...省略无关逻辑
}
// ...省略无关逻辑
}
`

可以转化的用 `JS_NewInt32` 去处理，否则返回 NaN。

## 5. Unary Operator (+)
[ECMAScript (ECMA-262) Unary Plus Operator](https://tc39.es/ecma262/#sec-unary-plus-operator-runtime-semantics-evaluation)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503114251.png)一元运算符加号是笔者最喜欢用的一种字符串转数值的方式，标准中它没有什么花里胡哨的、非常简介明了，就是用来做数值类型转换的。

### 5.1 V8 中的 UnaryPlus
语法分析阶段同 Double tilde (~~) Operator，此处不再赘述。

### 5.2 JavaScriptCore 中的 UnaryPlus
语法分析阶段同 Double tilde (~~) Operator，此处不再赘述。

### 5.3 QuickJS 中的 UnaryPlus
语法分析阶段同 Double tilde (~~) Operator，此处不再赘述。最后依然走到 `JS_CallInternal`。

[→ quickjs.c]

`/* argv[] is modified if (flags & JS_CALL_FLAG_COPY_ARGV) = 0. */
static JSValue JS_CallInternal(JSContext *caller_ctx, JSValueConst func_obj,
                               JSValueConst this_obj, JSValueConst new_target,
                               int argc, JSValue *argv, int flags)
{
    JSRuntime *rt = caller_ctx->rt;
    JSContext *ctx;
    JSObject *p;
    JSFunctionBytecode *b;
    JSStackFrame sf_s, *sf = &sf_s;
    const uint8_t *pc;
// ...省略无关代码

for(;;) {
int call_argc;
JSValue *call_argv;
SWITCH(pc) {
// ...
CASE(OP_plus):
{
    JSValue op1;
uint32_t tag;
op1 = sp[-1];
tag = JS_VALUE_GET_TAG(op1);
if (tag == JS_TAG_INT || JS_TAG_IS_FLOAT64(tag)) {
} else {
if (js_unary_arith_slow(ctx, sp, opcode))
 goto exception;
}
BREAK;
}
// ...省略无关代码
}
}
// ...省略无关代码
}
`

可以发现当操作数是 Int 或 Float 时，就直接不处理，和标准中规范的一致。而其他情况就调用 `js_unary_arith_slow`，若调用过程中遇到异常就走异常逻辑：

`static no_inline __exception int js_unary_arith_slow(JSContext *ctx, JSValue *sp, OPCodeEnum op)
{
    JSValue op1;
    double d;

    op1 = sp[-1];
    if (unlikely(JS_ToFloat64Free(ctx, &d, op1))) {
        sp[-1] = JS_UNDEFINED;
        return -1;
    }
    switch(op) {
    case OP_inc:
        d++;
        break;
    case OP_dec:
        d--;
        break;
    case OP_plus:
        break;
    case OP_neg:
        d = -d;
        break;
    default:
        abort();
    }
    sp[-1] = JS_NewFloat64(ctx, d);
    return 0;
}
`

这里的 `JS_ToFloat64Free` 的内部处理逻辑和和  4.3 时的 `JS_ToFloat64Free` 一样，不再赘述。`js_unary_arith_slow` 处理完数值转换之后，若运算符是一元运算加号，则直接返回；否则还会根据运算符再做相应的运算处理，如自增符还需要+1 等。

至此，我们讲解了以下 5 个方法在解释器中的具体实现：

- parseInt()
- parseFloat()
- Number()
- Double tilde (~~) Operator
- Unary Operator (+)

除却以上 5 个数值转换方法之外，还有以下 4 个方法，因篇幅问题本文暂且不再详述：

- Math.floor()
- Multiply with number
- The Signed Right Shift Operator(>>)
- The Unsigned Right Shift Operator(>>>)

字符串转数值各有优劣，使用者可根据自己的需要进行选用，以下是我个人总结的一些经验：

如果返回值只要求整形：

- 追求代码简洁和执行效率，对输入值有一定的把握（无需防御），优先选用 Unary Operator (+)
- 对输入值没有把握，需要做防御式编程，使用  parseInt()
- 需要支持 BigInt， 优先考虑使用 Number() ；如果用 Double tilde (~~) Operator，需要注意 31 位问题。

如果返回值要求浮点型：

- 追求代码简洁和执行效率，对输入值有一定的把握（无需防御），优先选用 Unary Operator (+)
- 对输入值没有把握，需要做防御式编程，使用  parseFloat()
- 需要支持 BigInt，使用 parseFloat()
