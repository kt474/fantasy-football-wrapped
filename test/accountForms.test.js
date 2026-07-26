import { readFileSync } from "node:fs";
import { baseParse, NodeTypes } from "@vue/compiler-dom";
import { parse as parseSfc } from "@vue/compiler-sfc";
import { describe, expect, test } from "vitest";

const accountSource = readFileSync("src/views/Account.vue", "utf8");
const { descriptor } = parseSfc(accountSource);
const template = baseParse(descriptor.template.content);

const elements = [];

const visit = (node) => {
  if (node.type === NodeTypes.ELEMENT) {
    elements.push(node);
  }

  node.children?.forEach(visit);
  node.branches?.forEach(visit);
};

visit(template);

const getAttribute = (node, name) =>
  node.props.find(
    (property) =>
      property.type === NodeTypes.ATTRIBUTE && property.name === name
  );

const getDirective = (node, name, argument) =>
  node.props.find(
    (property) =>
      property.type === NodeTypes.DIRECTIVE &&
      property.name === name &&
      property.arg?.content === argument
  );

const descendants = (node) => {
  const matches = [];

  const collect = (child) => {
    if (child.type === NodeTypes.ELEMENT) {
      matches.push(child);
    }

    child.children?.forEach(collect);
    child.branches?.forEach(collect);
  };

  node.children.forEach(collect);
  return matches;
};

describe("account authentication forms", () => {
  const forms = elements.filter((node) => node.tag === "form");

  test("use native form submission for every credential flow", () => {
    const submitHandlers = forms.map((form) => {
      const submit = getDirective(form, "on", "submit");

      expect(submit?.modifiers.map((modifier) => modifier.content)).toContain(
        "prevent"
      );
      expect(getDirective(form, "bind", "aria-busy")?.exp?.content).toBe(
        "authStore.loading"
      );

      return submit?.exp?.content;
    });

    expect(submitHandlers).toEqual([
      "resetPassword",
      "verifySignUpOtp",
      "signUp",
      "signIn",
    ]);
  });

  test.each([
    ["recovery-password", "new-password"],
    ["recovery-password-confirm", "confirm-password"],
    ["signup-verification-code", "verification-code"],
    ["signup-email", "email"],
    ["signup-password", "password"],
    ["signin-email", "email"],
    ["signin-password", "password"],
  ])("connects the %s label to a named input", (id, name) => {
    const input = elements.find(
      (node) =>
        node.tag === "Input" && getAttribute(node, "id")?.value?.content === id
    );
    const label = elements.find(
      (node) =>
        node.tag === "FieldLabel" &&
        getAttribute(node, "for")?.value?.content === id
    );

    expect(input).toBeDefined();
    expect(getAttribute(input, "name")?.value?.content).toBe(name);
    expect(label).toBeDefined();
  });

  test("requires credentials and prevents duplicate submissions", () => {
    forms.forEach((form) => {
      const formElements = descendants(form);
      const submitButton = formElements.find(
        (node) =>
          node.tag === "Button" &&
          getAttribute(node, "type")?.value?.content === "submit"
      );

      expect(submitButton).toBeDefined();
      expect(
        getDirective(submitButton, "bind", "disabled")?.exp?.content
      ).toBe("authStore.loading");

      formElements
        .filter((node) => node.tag === "Input")
        .forEach((input) => {
          expect(getAttribute(input, "required")).toBeDefined();
        });

      formElements
        .filter(
          (node) =>
            ["Button", "button"].includes(node.tag) && node !== submitButton
        )
        .forEach((button) => {
          expect(getAttribute(button, "type")?.value?.content).toBe("button");
        });
    });
  });
});
