/**
 * Tests for SkillManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Tauri APIs
vi.mock("@tauri-apps/api/event", () => ({
    emit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@core/infra/Store", () => ({
    getStore: vi.fn().mockResolvedValue({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        save: vi.fn().mockResolvedValue(undefined),
    }),
}));

// Mock SkillDiscovery
vi.mock("./SkillDiscovery", () => ({
    discoverSkills: vi.fn(),
    refreshSkills: vi.fn(),
    clearSkillCache: vi.fn(),
}));

import { SkillManager, getSkillManager, SKILLS_CHANGED_EVENT } from "./SkillManager";
import { discoverSkills, clearSkillCache } from "./SkillDiscovery";
import { emit } from "@tauri-apps/api/event";
import { getStore } from "@core/infra/Store";
import { ISkill } from "./SkillTypes";

const mockDiscoverSkills = vi.mocked(discoverSkills);
const mockEmit = vi.mocked(emit);
const mockGetStore = vi.mocked(getStore);

// Sample skills for testing
const sampleSkill1: ISkill = {
    id: "test-skill",
    metadata: {
        name: "test-skill",
        description: "A test skill",
    },
    content: "# Instructions\nDo the thing.",
    location: "user",
    filePath: "/path/to/test-skill/SKILL.md",
    folderPath: "/path/to/test-skill",
    scripts: [],
    references: [],
};

const sampleSkill2: ISkill = {
    id: "another-skill",
    metadata: {
        name: "another-skill",
        description: "Another test skill",
    },
    content: "# More Instructions",
    location: "project",
    filePath: "/path/to/another-skill/SKILL.md",
    folderPath: "/path/to/another-skill",
    scripts: [
        {
            name: "deploy.sh",
            relativePath: "scripts/deploy.sh",
            absolutePath: "/path/to/another-skill/scripts/deploy.sh",
            interpreter: "bash",
        },
    ],
    references: ["/path/to/another-skill/README.md"],
};

describe("SkillManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        SkillManager.resetInstance();

        // Default mock: return sample skills
        mockDiscoverSkills.mockResolvedValue({
            skills: [sampleSkill1, sampleSkill2],
            errors: [],
        });

        // Default mock: no persisted state
        mockGetStore.mockResolvedValue({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            save: vi.fn().mockResolvedValue(undefined),
        } as any);
    });

    afterEach(() => {
        SkillManager.resetInstance();
    });

    describe("singleton", () => {
        it("should return the same instance", () => {
            const instance1 = SkillManager.getInstance();
            const instance2 = SkillManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        it("should be accessible via getSkillManager helper", () => {
            const instance = SkillManager.getInstance();
            const helper = getSkillManager();
            expect(instance).toBe(helper);
        });
    });

    describe("initialize", () => {
        it("should discover skills on initialize", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            expect(mockDiscoverSkills).toHaveBeenCalled();
            expect(manager.isInitialized()).toBe(true);
        });

        it("should populate skills registry", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const skills = manager.getAllSkills();
            expect(skills).toHaveLength(2);
            expect(skills.map((s) => s.metadata.name)).toContain("test-skill");
            expect(skills.map((s) => s.metadata.name)).toContain("another-skill");
        });

        it("should emit skills-changed event after initialize", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            expect(mockEmit).toHaveBeenCalledWith(
                SKILLS_CHANGED_EVENT,
                expect.objectContaining({
                    skills: expect.any(Array),
                    states: expect.any(Object),
                })
            );
        });

        it("should restore persisted states", async () => {
            // Mock persisted state
            mockGetStore.mockResolvedValue({
                get: vi.fn().mockResolvedValue({
                    "test-skill": {
                        enabled: false,
                        invocationMode: "manual",
                        lastUsed: "2025-01-01T00:00:00Z",
                    },
                }),
                set: vi.fn().mockResolvedValue(undefined),
                save: vi.fn().mockResolvedValue(undefined),
            } as any);

            const manager = SkillManager.getInstance();
            await manager.initialize();

            const state = manager.getSkillState("test-skill");
            expect(state?.enabled).toBe(false);
            expect(state?.invocationMode).toBe("manual");
            expect(state?.lastUsed).toBe("2025-01-01T00:00:00Z");
        });

        it("should default new skills to enabled with auto mode", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const state = manager.getSkillState("test-skill");
            expect(state?.enabled).toBe(true);
            expect(state?.invocationMode).toBe("auto");
        });
    });

    describe("getAllSkills", () => {
        it("should return all discovered skills", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const skills = manager.getAllSkills();
            expect(skills).toHaveLength(2);
        });
    });

    describe("getEnabledSkills", () => {
        it("should filter to enabled skills only", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            // Disable one skill
            await manager.disableSkill("test-skill");

            const enabled = manager.getEnabledSkills();
            expect(enabled).toHaveLength(1);
            expect(enabled[0].metadata.name).toBe("another-skill");
        });
    });

    describe("getAutoSkills", () => {
        it("should return enabled skills with auto mode", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            // Set one to manual
            await manager.setInvocationMode("test-skill", "manual");

            const auto = manager.getAutoSkills();
            expect(auto).toHaveLength(1);
            expect(auto[0].metadata.name).toBe("another-skill");
        });
    });

    describe("getManualSkills", () => {
        it("should return enabled skills with manual mode", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            // Set one to manual
            await manager.setInvocationMode("test-skill", "manual");

            const manual = manager.getManualSkills();
            expect(manual).toHaveLength(1);
            expect(manual[0].metadata.name).toBe("test-skill");
        });
    });

    describe("getSkill", () => {
        it("should return skill by id", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const skill = manager.getSkill("test-skill");
            expect(skill).toBeDefined();
            expect(skill?.metadata.name).toBe("test-skill");
        });

        it("should return undefined for non-existent skill", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const skill = manager.getSkill("non-existent");
            expect(skill).toBeUndefined();
        });
    });

    describe("enableSkill / disableSkill", () => {
        it("should enable a skill", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();
            await manager.disableSkill("test-skill");

            expect(manager.getSkillState("test-skill")?.enabled).toBe(false);

            await manager.enableSkill("test-skill");
            expect(manager.getSkillState("test-skill")?.enabled).toBe(true);
        });

        it("should disable a skill", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            await manager.disableSkill("test-skill");
            expect(manager.getSkillState("test-skill")?.enabled).toBe(false);
        });

        it("should persist state on enable/disable", async () => {
            const mockSet = vi.fn().mockResolvedValue(undefined);
            const mockSave = vi.fn().mockResolvedValue(undefined);
            mockGetStore.mockResolvedValue({
                get: vi.fn().mockResolvedValue(null),
                set: mockSet,
                save: mockSave,
            } as any);

            const manager = SkillManager.getInstance();
            await manager.initialize();

            await manager.disableSkill("test-skill");

            expect(mockSet).toHaveBeenCalledWith(
                "skillStates",
                expect.objectContaining({
                    "test-skill": expect.objectContaining({ enabled: false }),
                })
            );
            expect(mockSave).toHaveBeenCalled();
        });

        it("should emit event on enable/disable", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            vi.clearAllMocks();
            await manager.disableSkill("test-skill");

            expect(mockEmit).toHaveBeenCalledWith(
                SKILLS_CHANGED_EVENT,
                expect.any(Object)
            );
        });
    });

    describe("toggleSkill", () => {
        it("should toggle skill state", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            expect(manager.getSkillState("test-skill")?.enabled).toBe(true);

            await manager.toggleSkill("test-skill");
            expect(manager.getSkillState("test-skill")?.enabled).toBe(false);

            await manager.toggleSkill("test-skill");
            expect(manager.getSkillState("test-skill")?.enabled).toBe(true);
        });
    });

    describe("setInvocationMode", () => {
        it("should set invocation mode", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            await manager.setInvocationMode("test-skill", "manual");
            expect(manager.getSkillState("test-skill")?.invocationMode).toBe("manual");

            await manager.setInvocationMode("test-skill", "auto");
            expect(manager.getSkillState("test-skill")?.invocationMode).toBe("auto");
        });
    });

    describe("recordSkillUsage", () => {
        it("should update lastUsed timestamp", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const before = manager.getSkillState("test-skill")?.lastUsed;
            expect(before).toBeUndefined();

            await manager.recordSkillUsage("test-skill");

            const after = manager.getSkillState("test-skill")?.lastUsed;
            expect(after).toBeDefined();
            expect(new Date(after!).getTime()).toBeGreaterThan(0);
        });
    });

    describe("getSkillContent", () => {
        it("should return skill content", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const content = manager.getSkillContent("test-skill");
            expect(content).toBe("# Instructions\nDo the thing.");
        });
    });

    describe("getSkillScripts", () => {
        it("should return script paths", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const scripts = manager.getSkillScripts("another-skill");
            expect(scripts).toHaveLength(1);
            expect(scripts[0]).toBe("/path/to/another-skill/scripts/deploy.sh");
        });
    });

    describe("getSkillReferences", () => {
        it("should return reference paths", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            const refs = manager.getSkillReferences("another-skill");
            expect(refs).toHaveLength(1);
            expect(refs[0]).toBe("/path/to/another-skill/README.md");
        });
    });

    describe("refresh", () => {
        it("should clear cache and re-discover", async () => {
            const manager = SkillManager.getInstance();
            await manager.initialize();

            vi.clearAllMocks();
            await manager.refresh();

            expect(clearSkillCache).toHaveBeenCalled();
            expect(mockDiscoverSkills).toHaveBeenCalled();
        });
    });
});
