---
title: "Engine Internals: String-to-Number Conversion in JavaScript"
date: 2022-05-03
tags: ["tech"]
description: ""
---

JavaScript offers nine ways to convert a string to a number:

- parseInt()
- parseFloat()
- Number()
- Double tilde (~~) Operator
- Unary Operator (+)
- Math.floor()
- Multiply with number
- The Signed Right Shift Operator (>>)
- The Unsigned Right Shift Operator (>>>)

Here's a comparison table showing how these methods differ in behavior:

![](https://airing.ursb.me/image/blog/media/20220503/covert_string_to_number.png)

> The source code for this comparison table is available at [https://airing.ursb.me/web/int.html](https://airing.ursb.me/web/int.html).

Beyond behavioral differences, there are also significant performance differences. Here are micro-benchmark results in Node.js (V8 engine):

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

`parseInt()`, `parseFloat()`, and `Math.floor()` are dramatically slower — around 2% the speed of the others, with `parseInt()` being the slowest at barely 1%.

Why such dramatic differences? What's actually happening under the hood? Let's explore the concrete implementations in V8, JavaScriptCore, and QuickJS — three mainstream JS engines.

Starting with `parseInt()`.

## 1. parseInt()

[ECMAScript (ECMA-262) parseInt](https://tc39.es/ecma262/#sec-parseint-string-radix)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503111054.png)

### 1.1 parseInt() in V8

In V8's [→ src/init/bootstrapper.cc], built-in JS language objects are registered. Here's the `parseInt` registration:

`Handle<JSFunction> number_fun = InstallFunction(isolate_, global, "Number", JS_PRIMITIVE_WRAPPER_TYPE, JSPrimitiveWrapper::kHeaderSize, 0, isolate_->initial_object_prototype(), Builtin::kNumberConstructor);

// Install Number.parseInt and Global.parseInt.
Handle<JSFunction> parse_int_fun = SimpleInstallFunction(isolate_, number_fun, "parseInt", Builtin::kNumberParseInt, 2, true);

JSObject::AddProperty(isolate_, global_object, "parseInt", parse_int_fun,
 native_context()->set_global_parse_int_fun(*parse_int_fun);
`

Both `Number.parseInt` and the global `parseInt` are registered via `SimpleInstallFunction`, binding the API to a Builtin. When JS calls `parseInt`, the engine calls `Builtin::kNumberParseInt`.

Builtins in V8 are code blocks executable at VM runtime. V8 currently supports five implementation types:

- **Platform-dependent assembly**: very efficient, but requires manual porting to each platform and is hard to maintain.
- **C++**: similar to runtime functions, full access to V8's runtime capabilities, but generally unsuitable for performance-sensitive areas.
- **JavaScript**: slow runtime calls, unpredictable performance from type pollution, complex JS semantics. V8 no longer uses JS builtins.
- **CodeStubAssembler**: efficient low-level code close to assembly, but platform-agnostic and readable.
- **Torque**: an improved version of CodeStubAssembler with TypeScript-like syntax. Easier to write without sacrificing performance. Many modern builtins use Torque.

The function `Builtin::kNumberParseInt` maps to `NumberParseInt`, implemented in Torque at [→ src/builtins/number.tq]:

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

        // Check if the absolute value of input is in the [1,1<<31[ range.
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

A quick intro to V8's data structures (see [→ src/objects/objects.h] for all definitions):

- **Smi**: inherits from Object; "small immediate integer," only 31 bits
- **HeapObject**: inherits from Object; superclass for everything allocated on the heap
- **PrimitiveHeapObject**: inherits from HeapObject
- **HeapNumber**: inherits from PrimitiveHeapObject; a heap object storing a number (used for large integers)

`parseInt` accepts two parameters: `parseInt(string, radix)`. The flow:

- First, check if `radix` is absent, 0, or 10. If not, it's non-decimal — fall back to the runtime `runtime::StringParseInt`.
- If it is decimal, check the type of the first argument.
  - If it's a Smi or an in-range (non-overflowing) HeapNumber, return the input directly — no conversion needed. If it overflows, `ChangeInt32ToTagged` is called, which force-casts to Int32 — results may be unexpected.
  - If it's a String, check whether it's a cached array index. If so, return the integer value; otherwise fall back to `runtime::StringParseInt`.

The focus shifts to `runtime::StringParseInt` in [→ src/runtime/runtime-numbers.cc]:

`// ES6 18.2.5 parseInt(string, radix) slow path
RUNTIME_FUNCTION(Runtime_StringParseInt) {
  HandleScope handle_scope(isolate);
  DCHECK_EQ(2, args.length());
  Handle<Object> string = args.at(0);
  Handle<Object> radix = args.at(1);

  Handle<String> subject;
  ASSIGN_RETURN_FAILURE_ON_EXCEPTION(isolate, subject,
                                     Object::ToString(isolate, string));
  subject = String::Flatten(isolate, subject);

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

Worth noting: per the standard, if `radix` is outside the range [2, 36], `NaN` is returned.

### 1.2 parseInt() in JavaScriptCore

JavaScriptCore registers built-in functions in [→ runtime/JSGlobalObjectFunctions.cpp]:

`JSC_DEFINE_HOST_FUNCTION(globalFuncParseInt, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    JSValue value = callFrame->argument(0);
    JSValue radixValue = callFrame->argument(1);

    // Optimized handling for numbers:
    // If the argument is 0 or a number in range 10^-6 <= n < INT_MAX+1, then parseInt
    // results in a truncation to integer.
    static const double tenToTheMinus6 = 0.000001;
    static const double intMaxPlusOne = 2147483648.0;
    if (value.isNumber()) {
        double n = value.asNumber();
        if (((n < intMaxPlusOne && n >= tenToTheMinus6) || !n) && radixValue.isUndefinedOrNull())
            return JSValue::encode(jsNumber(static_cast<int32_t>(n)));
    }

    return toStringView(globalObject, value, [&] (StringView view) {
        return JSValue::encode(jsNumber(parseInt(view, radixValue.toInt32(globalObject))));
    });
}
`

The comments are thorough — I'll let them speak for themselves. Ultimately it calls `parseInt`, whose core implementation lives in [→ runtime/ParseInt.h]. The code follows the ECMAScript spec step by step with excellent comments — I highly recommend reading it directly.

### 1.3 parseInt() in QuickJS

QuickJS's core is in [→ quickjs.c]. The registration:

`static const JSCFunctionListEntry js_global_funcs[] = {
    JS_CFUNC_DEF("parseInt", 2, js_parseInt ),
//...
}
`

The `js_parseInt` implementation:

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

Bellard's code has minimal comments but is wonderfully concise.

All three engines implement `parseInt` based on the ECMAScript standard, but each has its own style — reading them feels like comparing three authors with distinct voices.

Looking at the standard vs. the implementations, we can see that `parseInt` does a lot of preliminary work before the actual string-to-number conversion: input validation, default values, string normalization, range checks, and more. That's why it's slower — not because the core math is expensive, but because of all the setup.

Next, let's look at `parseFloat`.

## 2. parseFloat()

[ECMAScript (ECMA-262) parseFloat](https://tc39.es/ecma262/#sec-parsefloat-string)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503110924.png)

Two key differences from `parseInt`:

- Only one parameter — no radix support
- Returns floating-point values

### 2.1 parseFloat() in V8

The relevant code lives right next to `parseInt`. The key part [→ src/builtins/number.tq]:

`// ES6 #sec-number.parsefloat
transitioning javascript builtin NumberParseFloat(
    js-implicit context: NativeContext)(value: JSAny): Number {
  try {
    typeswitch (value) {
      case (s: Smi): {
        return s;
      }
      case (h: HeapNumber): {
        // Take care of -0.
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
    const hash: NameHash = s.raw_hash_field;
    if (IsIntegerIndex(hash) &&
        hash.array_index_length < kMaxCachedArrayIndexLength) {
      const arrayIndex: uint32 = hash.array_index_value;
      return SmiFromUint32(arrayIndex);
    }
    return runtime::StringParseFloat(s);
  }
}
`

And [→ src/runtime/runtime-numbers.cc]:

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

Simpler than `parseInt`, reflecting the simpler spec.

### 2.2 parseFloat() in JavaScriptCore

Even more concise:

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

        for (; data < end; ++data) {
            if (!isStrWhiteSpace(*data))
                break;
        }

        if (data == end)
            return PNaN;

        return jsStrDecimalLiteral(data, end);
    }

    const UChar* data = s.characters16();
    const UChar* end = data + size;

    for (; data < end; ++data) {
        if (!isStrWhiteSpace(*data))
            break;
    }

    if (data == end)
        return PNaN;

    return jsStrDecimalLiteral(data, end);
}
`

### 2.3 parseFloat() in QuickJS

QuickJS fits it in 12 lines:

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

The brevity is intentional — the latest ECMAScript spec doesn't require the ASCII/8-bit compatibility checks that JavaScriptCore includes, and QuickJS stays minimal.

## 3. Number()

[ECMAScript (ECMA-262) Number ( value )](https://tc39.es/ecma262/#sec-number-constructor-number-value)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503110831.png)

### 3.1 Number() in V8

`Number` is registered in [→ src/init/bootstrapper.cc]. The constructor `Builtin::kNumberConstructor` is implemented in Torque [→ src/builtins/constructor.tq]:

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

  const target: JSFunction = LoadTargetFromFrame();
  const result = UnsafeCast<JSPrimitiveWrapper>(
      FastNewObject(context, target, UnsafeCast<JSReceiver>(newTarget)));
  result.value = n;
  return result;
}
`

Steps 1–6 in the comments map directly to the ECMAScript spec. Notably, `Number` explicitly supports BigInt — which is why our comparison table showed those results.

### 3.2 Number() in JavaScriptCore

Same logic as V8, closely following the spec [→ runtime/NumberConstructor.cpp]:

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
    // ...
}
`

### 3.3 Number() in QuickJS

QuickJS makes BigInt support configurable via `CONFIG_BIGNUM` — a reflection of its philosophy of staying lean and customizable.

## 4. Double Tilde (~~) Operator

[ECMAScript (ECMA-262) Bitwise NOT Operator](https://tc39.es/ecma262/#sec-bitwise-not-operator-runtime-semantics-evaluation)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503113745.png)

The `~` operator leverages step 2 of the spec — type conversion of the operand — to convert strings to numbers. Let's see where this happens in the engine.

### 4.1 BitwiseNot in V8

V8 identifies unary operators in [→ src/parsing/token.h]. During AST construction in the parsing phase, unary operators are handled via `ParseUnaryExpression` and `BuildUnaryExpression`:

`Expression* Parser::BuildUnaryExpression(Expression* expression,
                                         Token::Value op, int pos) {
  DCHECK_NOT_NULL(expression);
  const Literal* literal = expression->AsLiteral();
  if (literal != nullptr) {
    if (op == Token::NOT) {
      return factory()->NewBooleanLiteral(literal->ToBooleanIsFalse(), pos);
    } else if (literal->IsNumberLiteral()) {
      double value = literal->AsNumber();
      switch (op) {
        case Token::ADD:
          return expression;
        case Token::SUB:
          return factory()->NewNumberLiteral(-value, pos);
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

If the literal is a number and the operator is `BIT_NOT`, the value is converted to Int32 and bitwise-negated.

### 4.2 BitwiseNot in JavaScriptCore

Similarly, during AST construction, when the `~` (TILDE) token is encountered:

`ExpressionNode* ASTBuilder::makeBitwiseNotNode(const JSTokenLocation& location, ExpressionNode* expr)
{
if (expr->isNumber())
        return createIntegerLikeNumber(location, ~toInt32(static_cast<NumberNode*>(expr)->value()));
    return new (m_parserArena) BitwiseNotNode(location, expr);
}
`

### 4.3 BitwiseNot in QuickJS

QuickJS generates the `OP_not` bytecode for `~`, then handles it during interpretation in `JS_CallInternal`:

`CASE(OP_not):
{
JSValue op1;
op1 = sp[-1];
if (JS_VALUE_GET_TAG(op1) == JS_TAG_INT) {
sp[-1] = JS_NewInt32(ctx, ~JS_VALUE_GET_INT(op1));
} else {
if (js_not_slow(ctx, sp))
goto exception;
}
}
BREAK;
`

If it's already an integer, it just negates it. Otherwise it calls `js_not_slow`, which calls `JS_ToInt32Free` to perform type conversion first.

## 5. Unary Operator (+)

[ECMAScript (ECMA-262) Unary Plus Operator](https://tc39.es/ecma262/#sec-unary-plus-operator-runtime-semantics-evaluation)

![](https://airing.ursb.me/image/blog/media/20220503/Pasted%20image%2020220503114251.png)

The unary `+` is personally my favorite way to convert strings to numbers. The spec is refreshingly simple — it's explicitly designed for numeric type conversion.

The V8 and JavaScriptCore parsing phases work the same as for `~~`, so I'll skip those. In QuickJS's interpreter:

`CASE(OP_plus):
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
`

If it's already Int or Float64, nothing happens — consistent with the spec. For other types, `js_unary_arith_slow` handles conversion via `JS_ToFloat64Free`, then returns the value as-is for `OP_plus`.

---

That covers five of the nine conversion methods:

- parseInt()
- parseFloat()
- Number()
- Double tilde (~~) Operator
- Unary Operator (+)

The remaining four won't be covered here due to length constraints:

- Math.floor()
- Multiply with number
- The Signed Right Shift Operator (>>)
- The Unsigned Right Shift Operator (>>>)

Each method has tradeoffs. Here's my personal guide for choosing:

**If you need an integer result:**

- Clean code and maximum performance, with predictable input → use Unary Operator (+)
- Defensive coding for unknown inputs → use parseInt()
- Need BigInt support → prefer Number(); if using Double tilde (~~), watch out for the 31-bit overflow issue

**If you need a floating-point result:**

- Clean code and maximum performance, with predictable input → use Unary Operator (+)
- Defensive coding for unknown inputs → use parseFloat()
- Need BigInt support → use parseFloat()
