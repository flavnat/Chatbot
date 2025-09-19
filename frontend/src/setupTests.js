import React from "react";
import "@testing-library/jest-dom";

// Mock styled-components with a callable default export that supports
jest.mock("styled-components", () => {
    // eslint-disable-next-line no-undef
    const React = require("react");
    // base function: styled(Component) => returns a tagged-template function
    const baseStyled = jest.fn().mockImplementation((componentOrTag) => {
        // return the tagged-template function which receives template literal args
        // eslint-disable-next-line no-unused-vars
        return (..._templateArgs) => {
            if (typeof componentOrTag === "string") {
                // For styled.div, return a component function that passes through props
                const voidElements = new Set([
                    "area",
                    "base",
                    "br",
                    "col",
                    "embed",
                    "hr",
                    "img",
                    "input",
                    "link",
                    "meta",
                    "param",
                    "source",
                    "track",
                    "wbr",
                ]);
                return (props) => {
                    const { children, ...otherProps } = props;
                    const elementChildren = voidElements.has(componentOrTag)
                        ? undefined
                        : children || "mock";
                    return React.createElement(
                        componentOrTag,
                        otherProps,
                        elementChildren
                    );
                };
            } else {
                // For styled(Component), return the component
                return componentOrTag;
            }
        };
    });

    // attach named exports to the base function
    baseStyled.keyframes = jest.fn();
    baseStyled.css = jest.fn();
    baseStyled.createGlobalStyle = jest.fn();
    baseStyled.ThemeProvider = jest
        .fn()
        .mockImplementation(({ children }) => children);
    baseStyled.ThemeContext = jest.fn();

    // Proxy to support styled.div, styled.span, etc.
    const styledProxy = new Proxy(baseStyled, {
        get(target, prop) {
            // If property exists on the function (named exports), return it
            if (prop in target) return target[prop];
            // For any tag access (styled.div), return a function that behaves like styled('div')
            return (...args) => target(prop)(...args);
        },
    });

    // Attach named exports to the proxy for convenience and interop
    styledProxy.keyframes = baseStyled.keyframes;
    styledProxy.css = baseStyled.css;
    styledProxy.createGlobalStyle = baseStyled.createGlobalStyle;
    styledProxy.ThemeProvider = baseStyled.ThemeProvider;
    styledProxy.ThemeContext = baseStyled.ThemeContext;

    // Return an ES-module-like object so `import styled, { keyframes }` works.
    return {
        __esModule: true,
        default: styledProxy,
        keyframes: baseStyled.keyframes,
        css: baseStyled.css,
        createGlobalStyle: baseStyled.createGlobalStyle,
        ThemeProvider: baseStyled.ThemeProvider,
        ThemeContext: baseStyled.ThemeContext,
    };
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock ResizeObserver
Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    })),
});

// Mock IntersectionObserver
Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    })),
});

// Mock scrollIntoView
Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    writable: true,
    value: jest.fn(),
});
