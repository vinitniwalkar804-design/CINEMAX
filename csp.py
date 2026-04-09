import sys
import json

# Seat sections with pricing
SECTIONS = {
    'silver': {'rows': ['A', 'B', 'C'], 'price': 180, 'label': 'Silver'},
    'gold': {'rows': ['D', 'E', 'F', 'G', 'H'], 'price': 240, 'label': 'Gold'},
    'platinum': {'rows': ['I', 'J'], 'price': 300, 'label': 'Platinum'},
}

ROWS = ['A','B','C','D','E','F','G','H','I','J']
SEATS_PER_ROW = 20

def get_section_for_row(row):
    for section, data in SECTIONS.items():
        if row in data['rows']:
            return section
    return 'silver'

# Preferred rows (middle rows score higher)
ROW_PREFERENCE = {
    'A': 1, 'B': 2, 'C': 3, 'D': 7, 'E': 9, 'F': 10, 'G': 9, 'H': 7, 'I': 4, 'J': 3,
}

def center_score(seat_num):
    center = 10.5
    distance = abs(seat_num - center)
    return max(0, 10 - distance)

def score_seat(row, seat_num):
    return ROW_PREFERENCE.get(row, 1) + center_score(seat_num)

def allocate_seats(num_tickets, booked_seats, preferred_section=None):
    booked_set = set(booked_seats)
    available = []
    for row in ROWS:
        section = get_section_for_row(row)
        section_bonus = 5 if preferred_section and section == preferred_section else 0
        for s in range(1, SEATS_PER_ROW + 1):
            seat_id = f"{row}{s}"
            if seat_id not in booked_set:
                available.append({
                    'seat': seat_id,
                    'score': score_seat(row, s) + section_bonus,
                })

    if len(available) < num_tickets:
        return []

    # Try continuous seats
    best_group = find_continuous_seats(num_tickets, booked_set, preferred_section)
    if len(best_group) == num_tickets:
        return best_group

    # Fallback: best individual seats
    available.sort(key=lambda x: x['score'], reverse=True)
    return [c['seat'] for c in available[:num_tickets]]

def find_continuous_seats(num_tickets, booked_set, preferred_section):
    best_block = []
    best_score = -float('inf')
    for row in ROWS:
        section = get_section_for_row(row)
        section_bonus = 50 if preferred_section and section == preferred_section else 0
        for start in range(1, SEATS_PER_ROW - num_tickets + 2):
            block = []
            valid = True
            block_score = section_bonus
            for i in range(num_tickets):
                seat_id = f"{row}{start + i}"
                if seat_id in booked_set:
                    valid = False
                    break
                block.append(seat_id)
                block_score += score_seat(row, start + i)
            if valid and block_score > best_score:
                best_score = block_score
                best_block = block
    return best_block

if __name__ == "__main__":
    num_tickets = int(sys.argv[1])
    booked_seats = json.loads(sys.argv[2])
    seats = allocate_seats(num_tickets, booked_seats)
    print(json.dumps(seats))

    