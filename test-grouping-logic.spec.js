const { test, expect } = require('@playwright/test');

// 테스트용 함수들 (실제 코드와 동일)
function getNewGroupThreshold(groupSize) {
    const thresholds = { 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6 };
    return thresholds[groupSize] || Math.ceil(groupSize * 0.6);
}

function calculateTotalGroups(studentCount, groupSize) {
    if (studentCount === 0) return 0;

    const threshold = getNewGroupThreshold(groupSize);
    const baseGroups = Math.floor(studentCount / groupSize);
    const remainder = studentCount % groupSize;

    if (remainder === 0) {
        return baseGroups;
    } else if (remainder >= threshold) {
        return baseGroups + 1;
    } else {
        return baseGroups === 0 ? 1 : baseGroups;
    }
}

// 조편성 시뮬레이션 (실제 코드와 동일한 로직)
function simulateGroupAssignment(studentCount, groupSize) {
    const threshold = getNewGroupThreshold(groupSize);
    const baseGroups = Math.floor(studentCount / groupSize);
    const remainder = studentCount % groupSize;

    let totalGroups;
    let groupSizes = [];

    if (remainder === 0) {
        // 나누어 떨어지면 그대로
        totalGroups = baseGroups;
        for (let i = 0; i < totalGroups; i++) {
            groupSizes.push(groupSize);
        }
    } else if (remainder >= threshold) {
        // 남은 인원이 기준 이상이면 새 조 생성
        totalGroups = baseGroups + 1;
        for (let i = 0; i < baseGroups; i++) {
            groupSizes.push(groupSize);
        }
        groupSizes.push(remainder); // 마지막 조는 remainder명
    } else {
        // 남은 인원이 기준 미만이면 기존 조에 고르게 분배
        totalGroups = baseGroups === 0 ? 1 : baseGroups;
        const studentsPerGroup = Math.floor(studentCount / totalGroups);
        const extraStudents = studentCount % totalGroups;

        // 앞 (totalGroups - extraStudents)개 조는 studentsPerGroup명
        for (let i = 0; i < totalGroups - extraStudents; i++) {
            groupSizes.push(studentsPerGroup);
        }
        // 뒤 extraStudents개 조는 (studentsPerGroup + 1)명
        for (let i = 0; i < extraStudents; i++) {
            groupSizes.push(studentsPerGroup + 1);
        }
    }

    return { totalGroups, groupSizes };
}

test.describe('조편성 로직 테스트', () => {
    // 3명 기준 테스트
    test('3명 기준: 1명 남으면 기존 조에 분배', () => {
        // 7명 = 3*2 + 1, 1명은 기준(2명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(7, 3);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(7);
        // 7명을 2조에 분배: 3명 + 4명
        expect(result.groupSizes.sort((a,b) => a-b)).toEqual([3, 4]);
    });

    test('3명 기준: 2명 남으면 새 조 생성', () => {
        // 8명 = 3*2 + 2, 2명은 기준(2명) 이상 -> 3개 조
        const result = simulateGroupAssignment(8, 3);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([3, 3, 2]);
    });

    // 4명 기준 테스트
    test('4명 기준: 2명 남으면 기존 조에 분배', () => {
        // 10명 = 4*2 + 2, 2명은 기준(3명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(10, 4);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(10);
        // 10명을 2조에 분배: 5명 + 5명
        expect(result.groupSizes).toEqual([5, 5]);
    });

    test('4명 기준: 3명 남으면 새 조 생성', () => {
        // 11명 = 4*2 + 3, 3명은 기준(3명) 이상 -> 3개 조
        const result = simulateGroupAssignment(11, 4);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([4, 4, 3]);
    });

    // 5명 기준 테스트
    test('5명 기준: 2명 남으면 기존 조에 분배', () => {
        // 12명 = 5*2 + 2, 2명은 기준(3명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(12, 5);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(12);
        // 12명을 2조에 분배: 6명 + 6명
        expect(result.groupSizes).toEqual([6, 6]);
    });

    test('5명 기준: 3명 남으면 새 조 생성', () => {
        // 13명 = 5*2 + 3, 3명은 기준(3명) 이상 -> 3개 조
        const result = simulateGroupAssignment(13, 5);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([5, 5, 3]);
    });

    test('5명 기준: 4명 남으면 새 조 생성', () => {
        // 14명 = 5*2 + 4, 4명은 기준(3명) 이상 -> 3개 조
        const result = simulateGroupAssignment(14, 5);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([5, 5, 4]);
    });

    // 6명 기준 테스트
    test('6명 기준: 3명 남으면 기존 조에 분배', () => {
        // 15명 = 6*2 + 3, 3명은 기준(4명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(15, 6);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(15);
        // 15명을 2조에 분배: 7명 + 8명
        expect(result.groupSizes.sort((a,b) => a-b)).toEqual([7, 8]);
    });

    test('6명 기준: 4명 남으면 새 조 생성', () => {
        // 16명 = 6*2 + 4, 4명은 기준(4명) 이상 -> 3개 조
        const result = simulateGroupAssignment(16, 6);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([6, 6, 4]);
    });

    // 나누어 떨어지는 경우
    test('정확히 나누어 떨어지는 경우', () => {
        // 12명, 4명씩 -> 3개 조
        const result = simulateGroupAssignment(12, 4);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([4, 4, 4]);
    });

    // 학생 수가 groupSize보다 작은 경우
    test('학생 수가 기준 인원보다 적은 경우', () => {
        // 2명, 4명 기준 -> 1개 조
        const result = simulateGroupAssignment(2, 4);
        expect(result.totalGroups).toBe(1);
        expect(result.groupSizes).toEqual([2]);
    });

    // calculateTotalGroups 함수 테스트
    test('calculateTotalGroups 함수 검증', () => {
        // 3명 기준
        expect(calculateTotalGroups(7, 3)).toBe(2);  // 1명 남음 -> 2개 조
        expect(calculateTotalGroups(8, 3)).toBe(3);  // 2명 남음 -> 3개 조

        // 4명 기준
        expect(calculateTotalGroups(10, 4)).toBe(2); // 2명 남음 -> 2개 조
        expect(calculateTotalGroups(11, 4)).toBe(3); // 3명 남음 -> 3개 조

        // 5명 기준
        expect(calculateTotalGroups(12, 5)).toBe(2); // 2명 남음 -> 2개 조
        expect(calculateTotalGroups(13, 5)).toBe(3); // 3명 남음 -> 3개 조

        // 6명 기준
        expect(calculateTotalGroups(15, 6)).toBe(2); // 3명 남음 -> 2개 조
        expect(calculateTotalGroups(16, 6)).toBe(3); // 4명 남음 -> 3개 조
    });

    // 추가 테스트: 다양한 시나리오
    test('4명 기준: 1명 남으면 기존 조에 분배', () => {
        // 9명 = 4*2 + 1, 1명은 기준(3명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(9, 4);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(9);
        // 9명을 2조에 분배: 4명 + 5명
        expect(result.groupSizes.sort((a,b) => a-b)).toEqual([4, 5]);
    });

    test('6명 기준: 1명 남으면 기존 조에 분배', () => {
        // 13명 = 6*2 + 1, 1명은 기준(4명) 미만 -> 2개 조에 고르게 분배
        const result = simulateGroupAssignment(13, 6);
        expect(result.totalGroups).toBe(2);
        expect(result.groupSizes.reduce((a, b) => a + b, 0)).toBe(13);
        // 13명을 2조에 분배: 6명 + 7명
        expect(result.groupSizes.sort((a,b) => a-b)).toEqual([6, 7]);
    });

    test('6명 기준: 5명 남으면 새 조 생성', () => {
        // 17명 = 6*2 + 5, 5명은 기준(4명) 이상 -> 3개 조
        const result = simulateGroupAssignment(17, 6);
        expect(result.totalGroups).toBe(3);
        expect(result.groupSizes).toEqual([6, 6, 5]);
    });
});
