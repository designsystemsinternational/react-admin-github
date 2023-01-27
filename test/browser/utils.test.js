import { describe, expect, it } from "vitest";
import { resolveFilenameFromProperty } from "../../src/browser/utils";

describe("browser.utils", () => {
  describe("resolveFilenameFromProperty", () => {
    const mockData = {
      id: "test",
      nested: {
        id: "nested-test"
      }
    };

    it("should lookup the value for a string", () => {
      expect(resolveFilenameFromProperty("id", mockData)).toBe("test");
      expect(resolveFilenameFromProperty("nested.id", mockData)).toBe(
        "nested-test"
      );
    });

    it("should compute the value for a function", () => {
      expect(
        resolveFilenameFromProperty(data => data.id.toUpperCase(), mockData)
      ).toBe("TEST");
    });

    it("should return the fallback value if the property is not found", () => {
      expect(
        resolveFilenameFromProperty("not-found", mockData, "fallback")
      ).toBe("fallback");
    });

    it("should return the fallback value if the property function does not return", () => {
      expect(
        resolveFilenameFromProperty(
          () => {
            // Do something here, but forget to return
            1 + 1;
          },
          mockData,
          "fallback"
        )
      ).toBe("fallback");
    });
  });
});
